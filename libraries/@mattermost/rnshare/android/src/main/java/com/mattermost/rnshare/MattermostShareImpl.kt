package com.mattermost.rnshare

import android.app.Activity
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.work.Data
import androidx.work.OneTimeWorkRequest
import androidx.work.WorkManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.mattermost.rnshare.helpers.RealPathUtil
import com.mattermost.rnshare.helpers.toJson
import java.io.File

class MattermostShareImpl(private val reactContext: ReactApplicationContext) {
    private var tempFolder: File? = null

    companion object {
        const val NAME = "MattermostShare"
    }

    init {
        createNotificationChannel(reactContext)
    }

    fun getCurrentActivityName(): String {
        val currentActivity: Activity? = reactContext.currentActivity
        if (currentActivity != null) {
            val activityName = currentActivity.componentName.className
            val components = activityName.split("\\.".toRegex()).dropLastWhile { it.isEmpty() }.toTypedArray()
            return components[components.size - 1]
        }

        return ""
    }

    fun clear() {
        val currentActivity: Activity? = reactContext.currentActivity
        if (currentActivity != null && this.getCurrentActivityName() == "ShareActivity") {
            val intent = currentActivity.intent
            intent.setAction("")
            intent.removeExtra(Intent.EXTRA_TEXT)
            intent.removeExtra(Intent.EXTRA_STREAM)
        }
    }

    fun close(data: ReadableMap?) {
        this.clear()
        val currentActivity: Activity? = reactContext.currentActivity
        if (currentActivity == null || getCurrentActivityName() != "ShareActivity") {
            return
        }

        if (data != null && data.hasKey("serverUrl") && data.hasKey("token")) {
            val jsonObject = data.toJson()
            val jsonString = jsonObject.toString()
            val inputData = Data.Builder()
                    .putString("json_data", jsonString)
                    .putString("tempFolder", this.tempFolder?.absolutePath)
                    .build()

            val shareWorkerRequest = OneTimeWorkRequest.Builder(ShareWorker::class.java)
                    .setInputData(inputData)
                    .build()

            WorkManager.getInstance(reactContext).enqueue(shareWorkerRequest)
        }

        currentActivity.finishAndRemoveTask()
    }

    fun getSharedData(promise: Promise?) {
        val type: String?
        val action: String?
        val extra: String?
        val items = Arguments.createArray()
        val currentActivity: Activity? = reactContext.currentActivity

        if (currentActivity != null) {
            this.tempFolder = File(currentActivity.cacheDir, RealPathUtil.CACHE_DIR_NAME)
            val intent = currentActivity.intent
            action = intent.action
            type = intent.type
            extra = intent.getStringExtra(Intent.EXTRA_TEXT)

            if (Intent.ACTION_SEND == action && "text/plain" == type && extra != null) {
                items.pushMap(ShareUtils.getTextItem(extra))
            } else if (Intent.ACTION_SEND == action) {
                if (extra != null) {
                    items.pushMap(ShareUtils.getTextItem(extra))
                }

                val uri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)
                } else {
                    @Suppress("DEPRECATION")
                    intent.getParcelableExtra(Intent.EXTRA_STREAM)
                }

                if (uri != null) {
                    val fileInfo = ShareUtils.getFileItem(currentActivity, uri)
                    if (fileInfo != null) {
                        items.pushMap(fileInfo)
                    }
                }
            } else if (Intent.ACTION_SEND_MULTIPLE == action) {
                if (extra != null) {
                    items.pushMap(ShareUtils.getTextItem(extra))
                }

                val uris = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM, Uri::class.java)
                } else {
                    @Suppress("DEPRECATION")
                    intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM)
                }
                if (uris != null) {
                    for (uri in uris) {
                        val fileInfo = ShareUtils.getFileItem(currentActivity, uri)
                        if (fileInfo != null) {
                            items.pushMap(fileInfo)
                        }
                    }
                }
            }
        }
        promise?.resolve(items)
    }

    private fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "Share Channel"
            val descriptionText = "Channel for sharing content notifications"
            val importance = NotificationManager.IMPORTANCE_DEFAULT
            val channel = NotificationChannel("SHARE_CHANNEL", name, importance).apply {
                description = descriptionText
            }
            // Register the channel with the system
            val notificationManager: NotificationManager =
                    context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }
}
