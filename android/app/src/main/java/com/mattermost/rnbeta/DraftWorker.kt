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
import com.mattermost.turbolog.TurboLog
import org.json.JSONObject

class DraftWorker(appContext: Context, params: WorkerParameters) : Worker (appContext, params) {
    override fun doWork(): Result {
        val draftJson = inputData.getString("draft_data") ?: return Result.failure()

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
                    filesArray.pushMap(fileMap)
                }
            }
            val draftMap = mapOf(
                "channelId" to draft.optString("channel_id"),
                "message" to draft.optString("message"),
                "files" to filesArray
            )
            val reactApp = applicationContext as? ReactApplication
            val reactInstanceManager: ReactInstanceManager? = reactApp?.reactNativeHost?.reactInstanceManager
            val reactContext = reactInstanceManager?.currentReactContext

            if (reactContext != null && reactInstanceManager.hasStartedCreatingInitialContext()) {
                handleDraftWhileAppRunning(draftMap, reactContext)
            } else {
                handleDraftInBackground(draftMap)
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

    private fun handleDraftInBackground(draft: Map<String, Any?>) {
        // TODO
    }
}
