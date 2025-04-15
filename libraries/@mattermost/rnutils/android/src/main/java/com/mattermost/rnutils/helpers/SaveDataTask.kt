package com.mattermost.rnutils.helpers

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.webkit.MimeTypeMap
import androidx.core.content.FileProvider
import androidx.core.net.toUri
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.mattermost.rnutils.enums.Events
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.lang.ref.WeakReference
import java.util.Locale
import java.util.Objects
import java.util.concurrent.Executors

open class SaveDataTask(val reactContext: ReactApplicationContext) {
    private var mPickerPromise: Promise? = null
    private var fileContent: String? = null

    private val weakContext = WeakReference(reactContext.applicationContext)
    private val myExecutor = Executors.newSingleThreadExecutor()

    private lateinit var mActivityEventListener: ActivityEventListener

    companion object {
        const val SAVE_REQUEST: Int = 38641
    }

    init {
        mActivityEventListener = object : BaseActivityEventListener() {
            override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, intent: Intent?) {
                if (requestCode == SAVE_REQUEST) {
                    if (resultCode == Activity.RESULT_CANCELED) {
                        mPickerPromise?.reject(Events.SAVE_ERROR_EVENT.event, "Save operation cancelled")
                    } else if (resultCode == Activity.RESULT_OK) {
                        val uri = intent!!.data
                        if (uri == null) {
                            mPickerPromise?.reject(Events.SAVE_ERROR_EVENT.event, "No data found")
                        } else {
                            try {
                                fileContent?.let { save(it, uri) }
                                mPickerPromise?.resolve(uri.toString())
                            } catch (e: java.lang.Exception) {
                                mPickerPromise?.reject(Events.SAVE_ERROR_EVENT.event, e.message)
                            }
                        }
                    }

                    mPickerPromise = null
                    reactContext.removeActivityEventListener(mActivityEventListener)
                }
            }
        }

        reactContext.addActivityEventListener(mActivityEventListener)
    }

    private fun save(fromFile: String, toFile: Uri) {
        myExecutor.execute {
                    try {
                        val pfd = weakContext.get()?.contentResolver?.openFileDescriptor(toFile, "w")
                        val input = File(fromFile)
                        FileInputStream(input).use { fileInputStream ->
                            if (pfd != null) {
                                FileOutputStream(pfd.fileDescriptor).use { fileOutputStream ->
                                    val source = fileInputStream.channel
                                    val dest = fileOutputStream.channel
                                    dest.transferFrom(source, 0, source.size())
                                    source.close()
                                    dest.close()
                                }
                            }
                        }
                        pfd?.close()
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
        }
    }

    fun saveFile(filePath: String?, promise: Promise?) {
        val contentUri: Uri?
        var filename = ""

        if (filePath?.startsWith("content://") == true) {
            contentUri = filePath.toUri()
        } else {
            val newFile = filePath?.let { File(it) }
            filename = newFile?.name ?: ""
            val currentActivity: Activity? = reactContext.currentActivity
            if (currentActivity == null) {
                promise?.reject(Events.SAVE_ERROR_EVENT.event, "Activity doesn't exist")
                return
            }

            try {
                val packageName = currentActivity.packageName
                val authority = "$packageName.provider"
                contentUri = newFile?.let { FileProvider.getUriForFile(currentActivity, authority, it) }
            } catch (e: IllegalArgumentException) {
                promise?.reject(Events.SAVE_ERROR_EVENT.event, e.message)
                return
            }
        }

        if (contentUri == null) {
            promise?.reject(Events.SAVE_ERROR_EVENT.event, "Invalid file")
            return
        }

        val extension = MimeTypeMap.getFileExtensionFromUrl(filePath).lowercase(Locale.getDefault())
        var mimeType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension)
        if (mimeType == null) {
            mimeType = filePath?.let { RealPathUtil.getMimeType(it) }
        }

        val intent = Intent()
        intent.setAction(Intent.ACTION_CREATE_DOCUMENT)
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        intent.addCategory(Intent.CATEGORY_OPENABLE)
        intent.setType(mimeType)
        intent.putExtra(Intent.EXTRA_TITLE, filename)

        val activity = reactContext.currentActivity
        val pm = Objects.requireNonNull<Activity>(activity).packageManager
        if (intent.resolveActivity(pm) != null) {
            try {
                activity?.startActivityForResult(intent, SAVE_REQUEST)
                mPickerPromise = promise
                fileContent = filePath
            } catch (e: Exception) {
                promise?.reject(Events.SAVE_ERROR_EVENT.event, e.message)
            }
        } else {
            try {
                if (mimeType == null) {
                    throw Exception("It wasn't possible to detect the type of the file")
                }
                throw Exception("No app associated with this mime type")
            } catch (e: Exception) {
                promise?.reject(Events.SAVE_ERROR_EVENT.event, e.message)
            }
        }
    }
}
