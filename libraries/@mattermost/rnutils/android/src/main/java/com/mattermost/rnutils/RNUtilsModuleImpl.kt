package com.mattermost.rnutils

import android.app.Activity
import android.os.Build
import android.view.WindowManager
import androidx.core.net.toUri
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.mattermost.rnutils.helpers.Notifications
import com.mattermost.rnutils.helpers.RealPathUtil
import com.mattermost.rnutils.helpers.SaveDataTask
import com.mattermost.rnutils.helpers.SplitView

class RNUtilsModuleImpl(private val reactContext: ReactApplicationContext) {

    companion object {
        const val NAME = "RNUtils"

        private var context: ReactApplicationContext? = null
        private var hasRegisteredLoad = false

        fun sendJSEvent(eventName: String, data: ReadableMap?) {
            if (context?.hasActiveReactInstance() == true) {
                context?.emitDeviceEvent(eventName, data)
            }
        }

        private fun setCtx(reactContext: ReactApplicationContext) {
            context = reactContext
        }
    }

    init {
        setCtx(reactContext)
        SplitView.setCtx(reactContext)
        Notifications.setCtx(reactContext)
    }

    fun getTypedExportedConstants(): MutableMap<String, Any> {
        val map = mutableMapOf<String, Any>()
        val group = mutableMapOf<String, Any>()
        map["appGroupIdentifier"] = ""
        group["sharedDirectory"] = ""
        group["databasePath"] = ""
        map["appGroupSharedDirectory"] = group
        return map
    }

    fun getRealFilePath(filePath: String?, promise: Promise?) {
        val currentActivity: Activity? = reactContext.currentActivity
        var result = ""

        if (currentActivity != null) {
            val uri = filePath?.toUri()
            val path: String? = RealPathUtil.getRealPathFromURI(reactContext, uri)
            if (path != null) {
                result = "file://$path"
            }
        }

        promise?.resolve(result)
    }

    fun createZipFile(paths: List<String>, promise: Promise?) {
        var zipFile: java.io.File? = null
        var fos: java.io.FileOutputStream? = null
        var zos: java.util.zip.ZipOutputStream? = null
        
        try {
            val dateFormat = java.text.SimpleDateFormat("yyyyMMdd_HHmmss", java.util.Locale.getDefault())
            val date = java.util.Date()
            val fileName = "Logs_${dateFormat.format(date)}.zip"
            val tempDir = reactContext.cacheDir
            zipFile = java.io.File(tempDir, fileName)
            
            fos = java.io.FileOutputStream(zipFile)
            zos = java.util.zip.ZipOutputStream(fos)

            paths.forEach { path ->
                val file = java.io.File(path)
                if (file.exists()) {
                    var fis: java.io.FileInputStream? = null
                    try {
                        fis = java.io.FileInputStream(file)
                        val zipEntry = java.util.zip.ZipEntry(file.name)
                        zos.putNextEntry(zipEntry)

                        val buffer = ByteArray(1024)
                        var length: Int
                        while (fis.read(buffer).also { length = it } >= 0) {
                            zos.write(buffer, 0, length)
                        }

                        zos.closeEntry()
                    } finally {
                        fis?.close()
                    }
                } else {
                    // Clean up if a file is missing
                    cleanupResources(zos, fos, zipFile)
                    promise?.reject("File does not exist: $path")
                    return
                }
            }

            zos.close()
            fos.close()
            promise?.resolve(zipFile.absolutePath)
        } catch (e: Exception) {
            // Clean up on any error
            cleanupResources(zos, fos, zipFile)
            promise?.reject("Error creating ZIP file", e)
        }
    }

    private fun cleanupResources(
        zos: java.util.zip.ZipOutputStream?,
        fos: java.io.FileOutputStream?,
        zipFile: java.io.File?
    ) {
        try {
            zos?.close()
            fos?.close()
            zipFile?.delete()
        } catch (e: Exception) {
            // Log cleanup errors but don't throw as we're already in error handling
            android.util.Log.e("RNUtils", "Error cleaning up resources", e)
        }
    }

    fun saveFile(filePath: String?, promise: Promise?) {
        val task = SaveDataTask.getInstance(reactContext)
        task.saveFile(filePath, promise)
    }

    fun isRunningInSplitView(): WritableMap? {
        return SplitView.isRunningInSplitView()
    }

    fun getWindowDimensions(): WritableMap? {
        return SplitView.getWindowDimensions()
    }

    fun setHasRegisteredLoad() {
        hasRegisteredLoad = true
    }

    fun getHasRegisteredLoad(): WritableMap {
        val map = Arguments.createMap()
        map.putBoolean("hasRegisteredLoad", hasRegisteredLoad)
        return map
    }

    fun unlockOrientation() {}

    fun lockPortrait() {}

    fun deleteDatabaseDirectory(): WritableMap {
        val map = Arguments.createMap()
        map.putNull("error")
        map.putBoolean("success", true)
        return map
    }

    fun renameDatabase(databaseName: String?, newDatabaseName: String?): WritableMap {
        val map = Arguments.createMap()
        map.putNull("error")
        map.putBoolean("success", true)
        return map
    }

    fun deleteEntitiesFile(): Boolean {
        return true
    }

    fun getDeliveredNotifications(promise: Promise?) {
        Notifications.getDeliveredNotifications(promise)
    }

    fun removeChannelNotifications(serverUrl: String?, channelId: String?) {
        serverUrl?.let { channelId?.let { it1 -> Notifications.removeChannelNotifications(it, it1) } }
    }

    fun removeThreadNotifications(serverUrl: String?, threadId: String?) {
        serverUrl?.let { threadId?.let { it1 -> Notifications.removeThreadNotifications(it, it1) } }
    }

    fun removeServerNotifications(serverUrl: String?) {
        serverUrl?.let { Notifications.removeServerNotifications(it) }
    }

    fun setSoftKeyboardToAdjustNothing() {
        val currentActivity: Activity = reactContext.currentActivity ?: return
        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.Q) {
            return
        }

        currentActivity.runOnUiThread {
            currentActivity.window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING)
        }
    }

    fun setSoftKeyboardToAdjustResize() {
        val currentActivity: Activity = reactContext.currentActivity ?: return
        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.Q) {
            return
        }

        currentActivity.runOnUiThread {
            currentActivity.window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
        }
    }
}
