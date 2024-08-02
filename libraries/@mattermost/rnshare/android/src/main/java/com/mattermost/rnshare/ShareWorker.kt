package com.mattermost.rnshare

import android.content.pm.ServiceInfo
import android.content.Context
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.work.ForegroundInfo
import androidx.work.Worker
import androidx.work.WorkerParameters
import com.mattermost.rnshare.helpers.RealPathUtil
import okhttp3.MediaType
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.ResponseBody
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import java.io.File
import java.io.IOException
import java.util.Objects

class ShareWorker(context: Context, workerParameters: WorkerParameters) : Worker(context, workerParameters) {
    private val okHttpClient = OkHttpClient()
    private val jsonType: MediaType? = "application/json; charset=utf-8".toMediaTypeOrNull()

    override fun doWork(): Result {
        val jsonString = inputData.getString("json_data") ?: return Result.failure()
        val tempFolder = inputData.getString("tempFolder")

        try {
            val jsonObject = JSONObject(jsonString)
            val files = if (jsonObject.has("files")) jsonObject.getJSONArray("files") else null
            val serverUrl = jsonObject.getString("serverUrl")
            val token = jsonObject.getString("token")
            val postData = buildPostObject(jsonObject)
            if (files != null && files.length() > 0) {
                setForegroundAsync(createForegroundInfo())
                return uploadFiles(serverUrl, token, files, postData)
            } else {
                try {
                    return post(serverUrl, token, postData)
                } catch (e: IOException) {
                    Log.e(MattermostShareImpl.NAME, "Error sending the post", e)
                    return Result.failure()
                }
            }
        } catch (e: JSONException) {
            Log.e(MattermostShareImpl.NAME, "Failed to create the body to share the content", e)
            return Result.failure()
        } finally {
            tempFolder?.let { RealPathUtil.deleteTempFiles(File(it)) }
        }
    }

    private fun buildPostObject(data: JSONObject): JSONObject {
        val json = JSONObject()
        try {
            json.put("user_id", data.getString("userId"))
            json.put("channel_id", data.getString("channelId"))
            json.put("message", data.getString("message"))
        } catch (e: JSONException) {
            Log.e(MattermostShareImpl.NAME, "Failed to create the post object", e)
        }
        return json
    }

    @Throws(IOException::class)
    private fun post(serverUrl: String, token: String, postData: JSONObject): Result {
        val body = postData.toString().toRequestBody(jsonType)
        val request = Request.Builder()
                .header("Authorization", "BEARER $token")
                .url("$serverUrl/api/v4/posts")
                .post(body)
                .build()

        val response = okHttpClient.newCall(request).execute()
        response.body?.close()
        response.close()
        return Result.success()
    }

    private fun uploadFiles(serverUrl: String, token: String, files: JSONArray, postData: JSONObject): Result {
        try {
            val builder = MultipartBody.Builder()
                    .setType(MultipartBody.FORM)

            for (i in 0 until files.length()) {
                val file = files.getJSONObject(i)
                val mime = file.getString("type")
                val fullPath = file.getString("value")
                val filePath = fullPath.replaceFirst("file://".toRegex(), "")
                val fileInfo = File(filePath)
                if (fileInfo.exists()) {
                    val mediaType = mime.toMediaType()
                    builder.addFormDataPart("files", file.getString("filename"), fileInfo.asRequestBody(mediaType))
                }
            }

            builder.addFormDataPart("channel_id", postData.getString("channel_id"))
            val body: RequestBody = builder.build()
            val request = Request.Builder()
                    .header("Authorization", "BEARER $token")
                    .url("$serverUrl/api/v4/files")
                    .post(body)
                    .build()

            try {
                okHttpClient.newCall(request).execute().use { response ->
                    if (response.isSuccessful) {
                        val responseData = Objects.requireNonNull<ResponseBody>(response.body).string()
                        val responseJson = JSONObject(responseData)

                        response.body?.close()
                        response.close()

                        val fileInfoArray = responseJson.getJSONArray("file_infos")
                        val fileIds = JSONArray()
                        for (i in 0 until fileInfoArray.length()) {
                            val fileInfo = fileInfoArray.getJSONObject(i)
                            fileIds.put(fileInfo.getString("id"))
                        }
                        postData.put("file_ids", fileIds)
                        return post(serverUrl, token, postData)
                    }
                    return Result.failure()
                }
            } catch (e: IOException) {
                Log.e(MattermostShareImpl.NAME, "Failed to upload the files and post", e)
                return Result.failure()
            }
        } catch (e: JSONException) {
            Log.e(MattermostShareImpl.NAME, "Failed to create the multipart body to upload the files", e)
            return Result.failure()
        }
    }

    private fun createForegroundInfo(): ForegroundInfo {
        val notification = NotificationCompat.Builder(applicationContext, "SHARE_CHANNEL")
                .setContentTitle("Uploading Files")
                .setTicker("Uploading Files")
                .setContentText("File upload in progress")
                .setSmallIcon(applicationContext.resources.getIdentifier("ic_notification", "mipmap", applicationContext.packageName))
                .setOngoing(true)
                .build()
        return ForegroundInfo(1, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)

    }
}
