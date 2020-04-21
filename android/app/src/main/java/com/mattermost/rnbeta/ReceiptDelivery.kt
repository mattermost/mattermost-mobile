package com.mattermost.rnbeta

import android.content.Context
import android.os.Bundle
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.mattermost.react_native_interface.ResolvePromise
import com.mattermost.rnbeta.MattermostCredentialsHelper.getCredentialsForCurrentServer
import okhttp3.*
import org.json.JSONException
import org.json.JSONObject

object ReceiptDelivery {
    const val CURRENT_SERVER_URL = "@currentServerUrl"
    @JvmStatic
    fun send(context: Context?, ackId: String?, postId: String?, type: String?, isIdLoaded: Boolean, promise: ResolvePromise) {
        val reactApplicationContext = ReactApplicationContext(context)
        getCredentialsForCurrentServer(reactApplicationContext, object : ResolvePromise() {
            override fun resolve(value: Any?) {
                if (value is Boolean && !value) {
                    return
                }
                val map = value as WritableMap?
                if (map != null) {
                    var token = map.getString("password")
                    var serverUrl = map.getString("service")
                    if (serverUrl!!.isEmpty()) {
                        val credentials = token!!.split(",[ ]*").toTypedArray()
                        if (credentials.size == 2) {
                            token = credentials[0]
                            serverUrl = credentials[1]
                        }
                    }
                    Log.i("ReactNative", String.format("Send receipt delivery ACK=%s TYPE=%s to URL=%s with ID-LOADED=%s", ackId, type, serverUrl, isIdLoaded))
                    execute(serverUrl, postId, token, ackId, type, isIdLoaded, promise)
                }
            }
        })
    }

    internal fun execute(serverUrl: String?, postId: String?, token: String?, ackId: String?, type: String?, isIdLoaded: Boolean, promise: ResolvePromise) {
        if (token == null) {
            promise.reject("Receipt delivery failure", "Invalid token")
            return
        }
        if (serverUrl == null) {
            promise.reject("Receipt delivery failure", "Invalid server URL")
        }
        val json: JSONObject
        val receivedAt = System.currentTimeMillis()
        try {
            json = JSONObject()
            json.put("id", ackId)
            json.put("received_at", receivedAt)
            json.put("platform", "android")
            json.put("type", type)
            json.put("post_id", postId)
            json.put("is_id_loaded", isIdLoaded)
        } catch (e: JSONException) {
            Log.e("ReactNative", "Receipt delivery failed to build json payload")
            promise.reject("Receipt delivery failure", e.toString())
            return
        }
        val url = HttpUrl.parse(String.format("%s/api/v4/notifications/ack", serverUrl!!.replace("/$".toRegex(), "")))
        if (url != null) {
            val client = OkHttpClient()
            val JSON = MediaType.parse("application/json; charset=utf-8")
            val body = RequestBody.create(JSON, json.toString())
            val request = Request.Builder()
                    .header("Authorization", String.format("Bearer %s", token))
                    .header("Content-Type", "application/json")
                    .url(url)
                    .post(body)
                    .build()
            try {
                val response = client.newCall(request).execute()
                val responseBody = response.body()!!.string()
                if (response.code() != 200 || !isIdLoaded) {
                    throw Exception(responseBody)
                }
                val jsonResponse = JSONObject(responseBody)
                val bundle = Bundle()
                val keys = arrayOf("post_id", "category", "message", "team_id", "channel_id", "channel_name", "type", "sender_id", "sender_name", "version")
                for (i in keys.indices) {
                    val key = keys[i]
                    if (jsonResponse.has(key)) {
                        bundle.putString(key, jsonResponse.getString(key))
                    }
                }
                promise.resolve(bundle)
            } catch (e: Exception) {
                Log.e("ReactNative", "Receipt delivery failed to send")
                promise.reject("Receipt delivery failure", e.toString())
            }
        }
    }
}
