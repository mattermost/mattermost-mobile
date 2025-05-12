package com.mattermost.rnutils

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.ReadableArray

class RNUtilsModule(context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context) {
    private var implementation: RNUtilsModuleImpl = RNUtilsModuleImpl(context)

    override fun getName(): String = RNUtilsModuleImpl.NAME

    override fun getConstants(): MutableMap<String, Any> = implementation.getTypedExportedConstants()

    @ReactMethod
    fun addListener(eventType: String?) {
        // Keep: Required for RN built in Event Emitter Calls
    }

    @ReactMethod
    fun removeListeners(count: Double) {
        // Keep: Required for RN built in Event Emitter Calls
    }

    @ReactMethod
    fun getRealFilePath(filePath: String?, promise: Promise?) {
        implementation.getRealFilePath(filePath, promise)
    }

    @ReactMethod
    fun saveFile(filePath: String?, promise: Promise?) {
        implementation.saveFile(filePath, promise)
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun isRunningInSplitView(): WritableMap? {
        return implementation.isRunningInSplitView()
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getWindowDimensions(): WritableMap? {
        return implementation.getWindowDimensions()
    }

    @ReactMethod
    fun setHasRegisteredLoad() {
        implementation.setHasRegisteredLoad()
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getHasRegisteredLoad(): WritableMap {
        return implementation.getHasRegisteredLoad()
    }

    @ReactMethod
    fun unlockOrientation() {
        implementation.unlockOrientation()
    }

    @ReactMethod
    fun lockPortrait() {
        implementation.lockPortrait()
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun deleteDatabaseDirectory(databaseName: String?, shouldRemoveDirectory: Boolean): WritableMap {
        return implementation.deleteDatabaseDirectory()
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun renameDatabase(databaseName: String?, newDatabaseName: String?): WritableMap {
        return implementation.renameDatabase(databaseName, newDatabaseName)
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun deleteEntitiesFile(): Boolean {
        return implementation.deleteEntitiesFile()
    }

    @ReactMethod
    fun getDeliveredNotifications(promise: Promise?) {
        implementation.getDeliveredNotifications(promise)
    }

    @ReactMethod
    fun removeChannelNotifications(serverUrl: String?, channelId: String?) {
        implementation.removeChannelNotifications(serverUrl, channelId)
    }

    @ReactMethod
    fun removeThreadNotifications(serverUrl: String?, threadId: String?) {
        implementation.removeThreadNotifications(serverUrl, threadId)
    }

    @ReactMethod
    fun removeServerNotifications(serverUrl: String?) {
        implementation.removeServerNotifications(serverUrl)
    }

    @ReactMethod
    fun setSoftKeyboardToAdjustResize() {
        implementation.setSoftKeyboardToAdjustResize()
    }

    @ReactMethod
    fun setSoftKeyboardToAdjustNothing() {
        implementation.setSoftKeyboardToAdjustNothing()
    }

    @ReactMethod
    fun createZipFile(paths: ReadableArray, promise: Promise?) {
        val pathList = paths.toArrayList().map { it.toString() }
        implementation.createZipFile(pathList, promise)
    }
}
