package com.mattermost.rnbeta

import android.content.Context
import androidx.work.Worker
import androidx.work.WorkerParameters
import com.facebook.react.ReactApplication
import com.facebook.react.ReactInstanceManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableArray
import com.mattermost.rnshare.MattermostShareModule
import com.mattermost.helpers.DraftDataHelper
import com.mattermost.helpers.AppStateHelper
import com.mattermost.turbolog.TurboLog
import org.json.JSONArray
import org.json.JSONObject

class DraftWorker(appContext: Context, params: WorkerParameters) : Worker (appContext, params) {
    override fun doWork(): Result {
        val draftJson = inputData.getString("draft_data") ?: return Result.failure()
        val serverUrl = inputData.getString("serverUrl")

        return try {
            val draft = JSONObject(draftJson)
            val filesArray: WritableArray = Arguments.createArray()

            if (draft.has("file_infos")) {
                val filesInfo = draft.getJSONArray("file_infos")

                for (i in 0 until filesInfo.length()) {
                    val info = filesInfo.getJSONObject(i)
                    val fileMap = Arguments.createMap()
                    fileMap.putString("id", info.optString("id"))
                    fileMap.putString("name", info.optString("name"))
                    fileMap.putString("extension", info.optString("extension"))
                    fileMap.putString("mime_type", info.optString("mime_type"))
                    fileMap.putDouble("size", info.optDouble("size"))
                    filesArray.pushMap(fileMap)
                }
            }
            val draftMap = mapOf(
                "channelId" to draft.optString("channel_id"),
                "message" to draft.optString("message"),
                "files" to filesArray
            )

            if (AppStateHelper.isMainAppActive) {
                val reactApp = applicationContext as? ReactApplication
                val reactInstanceManager: ReactInstanceManager? = reactApp?.reactNativeHost?.reactInstanceManager
                val reactContext = reactInstanceManager?.currentReactContext
                if (reactContext != null && reactInstanceManager.hasStartedCreatingInitialContext()) {
                    handleDraftWhileAppRunning(draftMap, reactContext)
                }
            } else {
                handleDraftInBackground(serverUrl, draftMap)
            }

            Result.success()
        } catch (e: Exception) {
            val eMessage = e.message ?: "Error with no message"
            TurboLog.e("ReactNative", "DraftWorker Failed to process draft error=$eMessage")
            Result.failure()
        }
    }

    private fun handleDraftWhileAppRunning(draft: Map<String, Any?>, reactContext: ReactContext) {
        val writableDraft = Arguments.makeNativeMap(draft)
        val module = reactContext.getNativeModule(MattermostShareModule::class.java)
        module?.sendDraftUpdate(writableDraft)
    }

    private fun handleDraftInBackground(serverUrl: String?, draft: Map<String, Any?>) {
        if (serverUrl == null) return
        try {
            val channelId = draft["channelId"] as? String ?: return
            val message = draft["message"] as? String ?: ""

            val files = JSONArray()
            val filesList = draft["files"]
            if (filesList is WritableArray) {
                for (i in 0 until filesList.size()) {
                    val map = filesList.getMap(i)
                    val obj = JSONObject()
                    obj.put("id", map.getString("id") ?: "")
                    obj.put("name", map.getString("name") ?: "")
                    obj.put("extension", map.getString("extension") ?: "")
                    obj.put("mime_type", map.getString("mime_type") ?: "")
                    obj.put("size", map.getDouble("size"))
                    files.put(obj)
                }
            }
            val helper = DraftDataHelper(applicationContext)
            helper.saveDraft(serverUrl, channelId, message, files)
        } catch (e: Exception) {
            val eMessage = e.message ?: "Error with no message"
            TurboLog.e("ReactNative", "DraftWorker: Failed to save draft in background error=${eMessage}")
        }
    }
}
