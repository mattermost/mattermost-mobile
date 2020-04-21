package com.mattermost.rnbeta

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.RemoteInput
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.text.TextUtils
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.mattermost.react_native_interface.ResolvePromise
import com.mattermost.rnbeta.MattermostCredentialsHelper.getCredentialsForCurrentServer
import com.wix.reactnativenotifications.core.NotificationIntentAdapter
import okhttp3.*
import org.json.JSONException
import org.json.JSONObject
import java.io.IOException

class NotificationReplyBroadcastReceiver : BroadcastReceiver() {
    private var mContext: Context? = null
    private var bundle: Bundle? = null
    private var notificationManager: NotificationManager? = null
    override fun onReceive(context: Context, intent: Intent) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            val message = getReplyMessage(intent) ?: return
            mContext = context
            bundle = NotificationIntentAdapter.extractPendingNotificationDataFromIntent(intent)
            notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val reactApplicationContext = ReactApplicationContext(context)
            val notificationId = intent.getIntExtra(CustomPushNotification.NOTIFICATION_ID, -1)
            getCredentialsForCurrentServer(reactApplicationContext, object : ResolvePromise() {
                override fun resolve(value: Any?) {
                    if (value is Boolean && !value) {
                        return
                    }
                    val map = value as WritableMap?
                    if (map != null) {
                        val token = map.getString("password")
                        val serverUrl = map.getString("service")
                        replyToMessage(serverUrl, token, notificationId, message)
                    }
                }
            })
        }
    }

    protected fun replyToMessage(serverUrl: String?, token: String?, notificationId: Int, message: CharSequence) {
        val channelId = bundle!!.getString("channel_id")
        val postId = bundle!!.getString("post_id")
        var rootId = bundle!!.getString("root_id")
        if (TextUtils.isEmpty(rootId)) {
            rootId = postId
        }
        if (token == null || serverUrl == null) {
            onReplyFailed(notificationManager, notificationId, channelId)
            return
        }
        val client = OkHttpClient()
        val JSON = MediaType.parse("application/json; charset=utf-8")
        val json = buildReplyPost(channelId, rootId, message.toString())
        val body = RequestBody.create(JSON, json)
        val postsEndpoint = "/api/v4/posts?set_online=false"
        val url = String.format("%s%s", serverUrl.replace("/$".toRegex(), ""), postsEndpoint)
        Log.i("ReactNative", String.format("Reply URL=%s", url))
        val request = Request.Builder()
                .header("Authorization", String.format("Bearer %s", token))
                .header("Content-Type", "application/json")
                .url(url)
                .post(body)
                .build()
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.i("ReactNative", String.format("Reply FAILED exception %s", e.message))
                onReplyFailed(notificationManager, notificationId, channelId)
            }

            @Throws(IOException::class)
            override fun onResponse(call: Call, response: Response) {
                if (response.isSuccessful) {
                    onReplySuccess(notificationManager, notificationId, channelId)
                    Log.i("ReactNative", "Reply SUCCESS")
                } else {
                    Log.i("ReactNative", String.format("Reply FAILED status %s BODY %s", response.code(), response.body()!!.string()))
                    onReplyFailed(notificationManager, notificationId, channelId)
                }
            }
        })
    }

    protected fun buildReplyPost(channelId: String?, rootId: String?, message: String?): String {
        return try {
            val json = JSONObject()
            json.put("channel_id", channelId)
            json.put("message", message)
            json.put("root_id", rootId)
            json.toString()
        } catch (e: JSONException) {
            "{}"
        }
    }

    protected fun onReplyFailed(notificationManager: NotificationManager?, notificationId: Int, channelId: String?) {
        val CHANNEL_ID = "Reply job"
        val res = mContext!!.resources
        val packageName = mContext!!.packageName
        val smallIconResId = res.getIdentifier("ic_notification", "mipmap", packageName)
        val userInfoBundle = Bundle()
        userInfoBundle.putString("channel_id", channelId)
        val channel = NotificationChannel(CHANNEL_ID, CHANNEL_ID, NotificationManager.IMPORTANCE_LOW)
        notificationManager!!.createNotificationChannel(channel)
        val notification = Notification.Builder(mContext, CHANNEL_ID)
                .setContentTitle("Message failed to send.")
                .setSmallIcon(smallIconResId)
                .addExtras(userInfoBundle)
                .build()
        CustomPushNotification.clearNotification(mContext, notificationId, channelId)
        notificationManager.notify(notificationId, notification)
    }

    protected fun onReplySuccess(notificationManager: NotificationManager?, notificationId: Int, channelId: String?) {
        notificationManager!!.cancel(notificationId)
        CustomPushNotification.clearNotification(mContext, notificationId, channelId)
    }

    private fun getReplyMessage(intent: Intent): CharSequence? {
        val remoteInput = RemoteInput.getResultsFromIntent(intent)
        return remoteInput?.getCharSequence(CustomPushNotification.KEY_TEXT_REPLY)
    }
}
