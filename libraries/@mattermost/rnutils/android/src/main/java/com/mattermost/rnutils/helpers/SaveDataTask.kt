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
import io.reactivex.rxjava3.core.Single
import io.reactivex.rxjava3.android.schedulers.AndroidSchedulers
import io.reactivex.rxjava3.schedulers.Schedulers
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.lang.ref.WeakReference
import java.util.Locale
import java.util.Objects

open class SaveDataTask(private val reactContext: ReactApplicationContext) {
    private var mPickerPromise: Promise? = null
    private var fileContent: String? = null

    private val weakContext = WeakReference(reactContext.applicationContext)

    private lateinit var mActivityEventListener: ActivityEventListener

    companion object {
        const val SAVE_REQUEST: Int = 38641

        // Store a single instance of the listener
        private var activityEventListener: ActivityEventListener? = null
        private var instance: SaveDataTask? = null

        fun getInstance(reactContext: ReactApplicationContext): SaveDataTask {
            if (instance == null) {
                instance = SaveDataTask(reactContext)
                registerListener(reactContext)
            }
            return instance!!
        }

        private fun registerListener(reactContext: ReactApplicationContext) {
            if (activityEventListener == null) {
                activityEventListener = object : BaseActivityEventListener() {
                    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, intent: Intent?) {
                        if (requestCode == SAVE_REQUEST) {
                            val taskInstance = instance // Ensure we access the latest instance
                            if (taskInstance?.mPickerPromise != null) {
                                if (resultCode == Activity.RESULT_CANCELED) {
                                    taskInstance.mPickerPromise?.reject(Events.SAVE_ERROR_EVENT.event, "Save operation cancelled")
                                    taskInstance.mPickerPromise = null
                                } else if (resultCode == Activity.RESULT_OK) {
                                    val uri = intent?.data
                                    if (uri == null) {
                                        taskInstance.mPickerPromise?.reject(Events.SAVE_ERROR_EVENT.event, "No data found")
                                        taskInstance.mPickerPromise = null
                                    } else {
                                        taskInstance.save(taskInstance.fileContent!!, uri)
                                            .subscribeOn(Schedulers.io())
                                            .observeOn(AndroidSchedulers.mainThread())
                                            .subscribe({ success ->
                                                if (success) {
                                                    taskInstance.mPickerPromise?.resolve(uri.toString())
                                                } else {
                                                    taskInstance.mPickerPromise?.reject(Events.SAVE_ERROR_EVENT.event, "Save failed")
                                                }
                                                taskInstance.mPickerPromise = null
                                            }, { error ->
                                                taskInstance.mPickerPromise?.reject(Events.SAVE_ERROR_EVENT.event, error.message)
                                                taskInstance.mPickerPromise = null
                                            })
                                    }
                                }
                            }
                        }
                    }
                }
                reactContext.addActivityEventListener(activityEventListener!!)
            }
        }
    }

    private fun save(fromFile: String, toFile: Uri): Single<Boolean> {
        return Single.create { emitter ->
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
                emitter.onSuccess(true)
            } catch (e: Exception) {
                e.printStackTrace()
                emitter.onSuccess(false)
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