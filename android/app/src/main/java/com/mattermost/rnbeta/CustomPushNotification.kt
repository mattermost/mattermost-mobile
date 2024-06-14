package com.mattermost.rnbeta

import android.app.PendingIntent
import android.content.Context
import android.os.Bundle
import android.util.Log
import androidx.core.app.NotificationCompat
import com.mattermost.helpers.CustomPushNotificationHelper
import com.mattermost.helpers.DatabaseHelper
import com.mattermost.helpers.Network
import com.mattermost.helpers.NotificationHelper
import com.mattermost.helpers.PushNotificationDataHelper
import com.mattermost.helpers.database_extension.getServerUrlForIdentifier
import com.mattermost.share.ShareModule
import com.wix.reactnativenotifications.Defs.NOTIFICATION_RECEIVED_EVENT_NAME
import com.wix.reactnativenotifications.core.AppLaunchHelper
import com.wix.reactnativenotifications.core.AppLifecycleFacade
import com.wix.reactnativenotifications.core.JsIOHelper
import com.wix.reactnativenotifications.core.NotificationIntentAdapter
import com.wix.reactnativenotifications.core.notification.PushNotification
import kotlinx.coroutines.DelicateCoroutinesApi
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch

class CustomPushNotification(
        context: Context,
        bundle: Bundle,
        appLifecycleFacade: AppLifecycleFacade,
        appLaunchHelper: AppLaunchHelper,
        jsIoHelper: JsIOHelper
) : PushNotification(context, bundle, appLifecycleFacade, appLaunchHelper, jsIoHelper) {
    private val dataHelper = PushNotificationDataHelper(context)

    init {
        try {
            DatabaseHelper.instance?.init(context)
            Network.init(context)
            NotificationHelper.cleanNotificationPreferencesIfNeeded(context)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @OptIn(DelicateCoroutinesApi::class)
    override fun onReceived() {
        val initialData = mNotificationProps.asBundle()
        val type = initialData.getString("type")
        val ackId = initialData.getString("ack_id")
        val postId = initialData.getString("post_id")
        val channelId = initialData.getString("channel_id")
        val signature = initialData.getString("signature")
        val isIdLoaded = initialData.getString("id_loaded") == "true"
        val notificationId = NotificationHelper.getNotificationId(initialData)
        val serverUrl = addServerUrlToBundle(initialData)

        GlobalScope.launch {
            try {
                handlePushNotificationInCoroutine(serverUrl, type, channelId, ackId, isIdLoaded, notificationId, postId, signature)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private suspend fun handlePushNotificationInCoroutine(
            serverUrl: String?,
            type: String?,
            channelId: String?,
            ackId: String?,
            isIdLoaded: Boolean,
            notificationId: Int,
            postId: String?,
            signature: String?
    ) {
        if (ackId != null && serverUrl != null) {
            val response = ReceiptDelivery.send(ackId, serverUrl, postId, type, isIdLoaded)
            if (isIdLoaded && response != null) {
                val current = mNotificationProps.asBundle()
                if (!current.containsKey("server_url")) {
                    response.putString("server_url", serverUrl)
                }
                current.putAll(response)
                mNotificationProps = createProps(current)
            }
        }

        if (!CustomPushNotificationHelper.verifySignature(mContext, signature, serverUrl, ackId)) {
            Log.i("Mattermost Notifications Signature verification", "Notification skipped because we could not verify it.")
            return
        }

        finishProcessingNotification(serverUrl, type, channelId, notificationId)
    }

    override fun onOpened() {
        mNotificationProps?.let {
            digestNotification()
            NotificationHelper.clearChannelOrThreadNotifications(mContext, it.asBundle())
        }
    }

    private suspend fun finishProcessingNotification(serverUrl: String?, type: String?, channelId: String?, notificationId: Int) {
        val isReactInit = mAppLifecycleFacade.isReactInitialized()

        when (type) {
            CustomPushNotificationHelper.PUSH_TYPE_MESSAGE, CustomPushNotificationHelper.PUSH_TYPE_SESSION -> {
                val shareModule = ShareModule.getInstance()
                val currentActivityName = shareModule?.currentActivityName ?: ""
                Log.i("ReactNative", currentActivityName)
                if (!mAppLifecycleFacade.isAppVisible() || currentActivityName != "MainActivity") {
                    var createSummary = type == CustomPushNotificationHelper.PUSH_TYPE_MESSAGE
                    if (type == CustomPushNotificationHelper.PUSH_TYPE_MESSAGE) {
                        channelId?.let {
                            val notificationBundle = mNotificationProps.asBundle()
                            serverUrl?.let {
                                val notificationResult = dataHelper.fetchAndStoreDataForPushNotification(notificationBundle, isReactInit)
                                notificationResult?.let { result ->
                                    notificationBundle.putBundle("data", result)
                                    mNotificationProps = createProps(notificationBundle)
                                }
                            }
                            createSummary = NotificationHelper.addNotificationToPreferences(mContext, notificationId, notificationBundle)
                        }
                    }
                    buildNotification(notificationId, createSummary)
                }
            }
            CustomPushNotificationHelper.PUSH_TYPE_CLEAR -> NotificationHelper.clearChannelOrThreadNotifications(mContext, mNotificationProps.asBundle())
        }

        if (isReactInit) {
            notifyReceivedToJS()
        }
    }

    private fun buildNotification(notificationId: Int, createSummary: Boolean) {
        val pendingIntent = NotificationIntentAdapter.createPendingNotificationIntent(mContext, mNotificationProps)
        val notification = buildNotification(pendingIntent)
        if (createSummary) {
            val summary = getNotificationSummaryBuilder(pendingIntent).build()
            super.postNotification(summary, notificationId + 1)
        }
        super.postNotification(notification, notificationId)
    }

    override fun getNotificationBuilder(intent: PendingIntent): NotificationCompat.Builder {
        val bundle = mNotificationProps.asBundle()
        return CustomPushNotificationHelper.createNotificationBuilder(mContext, intent, bundle, false)
    }

    private fun getNotificationSummaryBuilder(intent: PendingIntent): NotificationCompat.Builder {
        val bundle = mNotificationProps.asBundle()
        return CustomPushNotificationHelper.createNotificationBuilder(mContext, intent, bundle, true)
    }

    private fun notifyReceivedToJS() {
        mJsIOHelper.sendEventToJS(NOTIFICATION_RECEIVED_EVENT_NAME, mNotificationProps.asBundle(), mAppLifecycleFacade.runningReactContext)
    }

    private fun addServerUrlToBundle(bundle: Bundle): String? {
        val dbHelper = DatabaseHelper.instance
        val serverId = bundle.getString("server_id")
        var serverUrl: String? = null

        dbHelper?.let {
            serverUrl = if (serverId == null) {
                it.onlyServerUrl
            } else {
                it.getServerUrlForIdentifier(serverId)
            }

            if (!serverUrl.isNullOrEmpty()) {
                bundle.putString("server_url", serverUrl)
                mNotificationProps = createProps(bundle)
            }
        }
        return serverUrl
    }
}
