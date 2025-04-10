package com.mattermost.rnutils

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.ReadableArray

class RNUtilsModule(val reactContext: ReactApplicationContext) : NativeRNUtilsSpec(reactContext) {
    private var implementation: RNUtilsModuleImpl = RNUtilsModuleImpl(reactContext)

    override fun getTypedExportedConstants(): MutableMap<String, Any> = implementation.getTypedExportedConstants()

    override fun addListener(eventType: String?) {
        // Keep: Required for RN built in Event Emitter Calls
    }

    override fun removeListeners(count: Double) {
        // Keep: Required for RN built in Event Emitter Calls
    }

    override fun getRealFilePath(filePath: String?, promise: Promise?) {
        implementation.getRealFilePath(filePath, promise)
    }

    override fun saveFile(filePath: String?, promise: Promise?) {
        implementation.saveFile(filePath, promise)
    }

    override fun isRunningInSplitView(): WritableMap? = implementation.isRunningInSplitView()

    override fun getWindowDimensions(): WritableMap? = implementation.getWindowDimensions()

    override fun setHasRegisteredLoad() = implementation.setHasRegisteredLoad()
    override fun getHasRegisteredLoad(): WritableMap = implementation.getHasRegisteredLoad()

    override fun unlockOrientation() {
        implementation.unlockOrientation()
    }

    override fun lockPortrait() {
        implementation.lockPortrait()
    }

    override fun deleteDatabaseDirectory(databaseName: String?, shouldRemoveDirectory: Boolean): WritableMap {
        return implementation.deleteDatabaseDirectory()
    }

    override fun renameDatabase(databaseName: String?, newDatabaseName: String?): WritableMap {
        return implementation.renameDatabase(databaseName, newDatabaseName)
    }

    override fun deleteEntitiesFile(): Boolean {
        return implementation.deleteEntitiesFile()
    }

    override fun getDeliveredNotifications(promise: Promise?) {
        implementation.getDeliveredNotifications(promise)
    }

    override fun removeChannelNotifications(serverUrl: String?, channelId: String?) {
        implementation.removeChannelNotifications(serverUrl, channelId)
    }

    override fun removeThreadNotifications(serverUrl: String?, threadId: String?) {
        implementation.removeThreadNotifications(serverUrl, threadId)
    }

    override fun removeServerNotifications(serverUrl: String?) {
        implementation.removeServerNotifications(serverUrl)
    }

    override fun setSoftKeyboardToAdjustResize() {
        implementation.setSoftKeyboardToAdjustResize()
    }

    override fun setSoftKeyboardToAdjustNothing() {
        implementation.setSoftKeyboardToAdjustNothing()
    }

    override fun createZipFile(paths: ReadableArray, promise: Promise?) {
        val pathList = paths.toArrayList().map { it.toString() }
        implementation.createZipFile(pathList, promise)
    }
}
