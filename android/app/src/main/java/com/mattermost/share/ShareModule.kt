package com.mattermost.share

import android.content.Intent
import android.net.Uri
import android.os.Parcelable
import com.facebook.react.bridge.*
import com.mattermost.rnbeta.MainApplication
import com.mattermost.share.RealPathUtil.deleteTempFiles
import com.mattermost.share.RealPathUtil.getMimeTypeFromUri
import com.mattermost.share.RealPathUtil.getRealPathFromURI
import okhttp3.*
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import java.io.File
import java.io.IOException
import java.util.*

class ShareModule(application: MainApplication, reactContext: ReactApplicationContext?) : ReactContextBaseJavaModule(reactContext!!) {
    private val client = OkHttpClient()
    private val mApplication: MainApplication
    private var tempFolder: File? = null
    override fun getName(): String {
        return "MattermostShare"
    }

    @ReactMethod
    fun clear() {
        val currentActivity = currentActivity
        if (currentActivity != null) {
            val intent = currentActivity.intent
            intent.action = ""
            intent.removeExtra(Intent.EXTRA_TEXT)
            intent.removeExtra(Intent.EXTRA_STREAM)
        }
    }

    override fun getConstants(): Map<String, Any>? {
        val constants = HashMap<String, Any>(1)
        constants["cacheDirName"] = CACHE_DIR_NAME
        constants["isOpened"] = mApplication.sharedExtensionIsOpened
        mApplication.sharedExtensionIsOpened = false
        return constants
    }

    @ReactMethod
    fun close(data: ReadableMap?) {
        this.clear()
        val currentActivity = currentActivity
        currentActivity?.finishAndRemoveTask()
        if (data != null && data.hasKey("url")) {
            val files = data.getArray("files")
            val serverUrl = data.getString("url")
            val token = data.getString("token")
            val postData = buildPostObject(data)
            if (files!!.size() > 0) {
                uploadFiles(serverUrl, token, files, postData)
            } else {
                try {
                    post(serverUrl, token, postData)
                } catch (e: IOException) {
                    e.printStackTrace()
                }
            }
        }
        deleteTempFiles(tempFolder!!)
    }

    @ReactMethod
    fun data(promise: Promise) {
        promise.resolve(processIntent())
    }

    @ReactMethod
    fun getFilePath(filePath: String?, promise: Promise) {
        val currentActivity = currentActivity
        val map = Arguments.createMap()
        if (currentActivity != null) {
            val uri = Uri.parse(filePath)
            val path = getRealPathFromURI(currentActivity, uri)
            if (path != null) {
                val text = "file://$path"
                map.putString("filePath", text)
            }
        }
        promise.resolve(map)
    }

    fun processIntent(): WritableArray {
        var map = Arguments.createMap()
        val items = Arguments.createArray()
        val currentActivity = currentActivity
        if (currentActivity != null) {
            tempFolder = File(currentActivity.cacheDir, CACHE_DIR_NAME)
            val intent = currentActivity.intent
            val action = intent.action
            var type = intent.type ?: ""
            if (Intent.ACTION_SEND == action && "text/plain" == type) {
                val text = intent.getStringExtra(Intent.EXTRA_TEXT)
                map.putString("value", text)
                map.putString("type", type)
                items.pushMap(map)
            } else if (Intent.ACTION_SEND == action) {
                val uri = intent.getParcelableExtra<Parcelable>(Intent.EXTRA_STREAM) as Uri
                val text = "file://${getRealPathFromURI(currentActivity, uri)}"
                map.putString("value", text)
                if (type == "image/*") {
                    type = "image/jpeg"
                } else if (type == "video/*") {
                    type = "video/mp4"
                }
                map.putString("type", type)
                items.pushMap(map)
            } else if (Intent.ACTION_SEND_MULTIPLE == action) {
                val uris = intent.getParcelableArrayListExtra<Uri>(Intent.EXTRA_STREAM)
                for (uri in uris) {
                    val filePath = getRealPathFromURI(currentActivity, uri!!)
                    map = Arguments.createMap()
                    val text = "file://$filePath"
                    map.putString("value", text)
                    type = getMimeTypeFromUri(currentActivity, uri)
                    if (type == "image/*") {
                        type = "image/jpeg"
                    } else if (type == "video/*") {
                        type = "video/mp4"
                    }
                    map.putString("type", type)
                    items.pushMap(map)
                }
            }
        }
        return items
    }

    private fun buildPostObject(data: ReadableMap): JSONObject {
        val json = JSONObject()
        try {
            json.put("user_id", data.getString("currentUserId"))
            if (data.hasKey("channelId")) {
                json.put("channel_id", data.getString("channelId"))
            }
            if (data.hasKey("value")) {
                json.put("message", data.getString("value"))
            }
        } catch (e: JSONException) {
            e.printStackTrace()
        }
        return json
    }

    @Throws(IOException::class)
    private fun post(serverUrl: String?, token: String?, postData: JSONObject) {
        val body = RequestBody.create(JSON, postData.toString())
        val request = Request.Builder()
                .header("Authorization", "BEARER $token")
                .url("$serverUrl/api/v4/posts")
                .post(body)
                .build()
        client.newCall(request).execute()
    }

    private fun uploadFiles(serverUrl: String?, token: String?, files: ReadableArray?, postData: JSONObject) {
        try {
            val builder = MultipartBody.Builder()
                    .setType(MultipartBody.FORM)
            for (i in 0 until files!!.size()) {
                val file = files.getMap(i)
                val filePath = file!!.getString("fullPath")!!.replaceFirst("file://".toRegex(), "")
                val fileInfo = File(filePath)
                if (fileInfo.exists()) {
                    val MEDIA_TYPE = MediaType.parse(file.getString("mimeType") ?: "")
                    builder.addFormDataPart("files", file.getString("filename"), RequestBody.create(MEDIA_TYPE, fileInfo))
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
                client.newCall(request).execute().use { response ->
                    if (response.isSuccessful) {
                        val responseData = response.body()!!.string()
                        val responseJson = JSONObject(responseData)
                        val fileInfoArray = responseJson.getJSONArray("file_infos")
                        val file_ids = JSONArray()
                        for (i in 0 until fileInfoArray.length()) {
                            val fileInfo = fileInfoArray.getJSONObject(i)
                            file_ids.put(fileInfo.getString("id"))
                        }
                        postData.put("file_ids", file_ids)
                        post(serverUrl, token, postData)
                    }
                }
            } catch (e: IOException) {
                e.printStackTrace()
            }
        } catch (e: JSONException) {
            e.printStackTrace()
        }
    }

    companion object {
        val JSON = MediaType.parse("application/json; charset=utf-8")
        const val CACHE_DIR_NAME = "mmShare"
    }

    init {
        mApplication = application
    }
}
