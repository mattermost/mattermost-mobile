package com.mattermost.rnbeta

import android.app.PendingIntent
import android.content.Context
import android.os.Bundle
import androidx.core.app.NotificationCompat
import com.mattermost.callsnative.managers.IncomingCallEntry
import com.mattermost.helpers.CustomPushNotificationHelper
import com.mattermost.helpers.DatabaseHelper
import com.mattermost.helpers.Network
import com.mattermost.helpers.PushNotificationDataHelper
import com.mattermost.helpers.database_extension.getServerUrlForIdentifier
import com.mattermost.rnutils.helpers.NotificationHelper
import com.mattermost.turbolog.TurboLog
import com.wix.reactnativenotifications.Defs.NOTIFICATION_RECEIVED_EVENT_NAME
import com.wix.reactnativenotifications.core.AppLaunchHelper
import com.wix.reactnativenotifications.core.AppLifecycleFacade
import com.wix.reactnativenotifications.core.JsIOHelper
import com.wix.reactnativenotifications.core.NotificationIntentAdapter
import com.wix.reactnativenotifications.core.notification.PushNotification
import kotlinx.coroutines.DelicateCoroutinesApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

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
        val isVoip = initialData.getString("voip") == "true"

        // Direct and Off are per-server choices, not global FCM switches.
        // Keep clear events so stale groups can still be dismissed, but do not
        // display or acknowledge ordinary pushes for a suppressed server.
        if (type != CustomPushNotificationHelper.PUSH_TYPE_CLEAR &&
            DirectNotificationStore.shouldSuppressFcm(mContext, serverUrl)) {
            return
        }

        Network.init(mContext)

        GlobalScope.launch {
            try {
                if (isVoip) {
                    handleVoipCallInCoroutine(serverUrl, channelId, ackId, isIdLoaded, notificationId, postId, signature, initialData)
                } else {
                    handlePushNotificationInCoroutine(serverUrl, type, channelId, ackId, isIdLoaded, notificationId, postId, signature)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    @OptIn(DelicateCoroutinesApi::class)
    private suspend fun handleVoipCallInCoroutine(
            serverUrl: String?,
            channelId: String?,
            ackId: String?,
            isIdLoaded: Boolean,
            notificationId: Int,
            postId: String?,
            signature: String?,
            initialData: Bundle
    ) {
        // Never create a ringing call surface for an unverified push.
        if (!CustomPushNotificationHelper.verifySignature(mContext, signature, serverUrl, ackId)) {
            TurboLog.w("ENCMA Calls", "VoIP push signature verification failed")
            return
        }
        if (serverUrl.isNullOrEmpty() || channelId.isNullOrEmpty()) {
            TurboLog.w("ENCMA Calls", "VoIP push is missing its server URL or channel ID")
            return
        }

        // While MainActivity is foreground, the existing in-app WebSocket
        // screen owns ringing. Acknowledge delivery without adding a second
        // native call screen or ringtone.
        if (com.mattermost.callsnative.managers.CallSurfaceCoordinator.isMainActivityForeground()) {
            if (ackId != null) {
                ReceiptDelivery.send(ackId, serverUrl, postId, CustomPushNotificationHelper.PUSH_TYPE_MESSAGE, isIdLoaded)
            }
            return
        }

        val uuid = try {
            IncomingCallEntry.report(
                mContext,
                IncomingCallEntry.Params(
                    channelId = channelId,
                    serverId = initialData.getString("server_id").orEmpty(),
                    serverUrl = serverUrl,
                    callerName = initialData.getString("sender_name").orEmpty(),
                    callerId = initialData.getString("sender_id").orEmpty(),
                    postId = postId.orEmpty(),
                    threadId = initialData.getString("root_id").orEmpty(),
                ),
            )
        } catch (e: Exception) {
            TurboLog.w("ENCMA Calls", "Native incoming-call setup failed: ${e.message}")
            null
        }

        if (uuid == null) {
            // Telecom can be unavailable because of device policy or an OEM
            // failure. Preserve the previous message alert rather than making
            // the call completely silent.
            handlePushNotificationInCoroutine(
                serverUrl,
                CustomPushNotificationHelper.PUSH_TYPE_MESSAGE,
                channelId,
                ackId,
                isIdLoaded,
                notificationId,
                postId,
                signature,
            )
            return
        }

        val callerId = initialData.getString("sender_id").orEmpty()
        if (callerId.isNotEmpty()) {
            GlobalScope.launch {
                try {
                    val bitmap = withContext(Dispatchers.IO) {
                        CustomPushNotificationHelper.userAvatar(mContext, serverUrl, callerId, null)
                    }
                    IncomingCallEntry.updateAvatar(mContext, uuid, bitmap)
                } catch (e: Exception) {
                    TurboLog.w("ENCMA Calls", "Caller avatar fetch failed: ${e.message}")
                }
            }
        }

        // For id_loaded pushes the ack response enriches the caller name. The
        // native ring starts immediately with the push's available display
        // data and is refreshed when this request completes.
        if (ackId != null) {
            val response = ReceiptDelivery.send(
                ackId,
                serverUrl,
                postId,
                CustomPushNotificationHelper.PUSH_TYPE_MESSAGE,
                isIdLoaded,
            )
            if (isIdLoaded && response != null) {
                val enrichedName = response.getString("sender_name").orEmpty()
                if (enrichedName.isNotEmpty()) {
                    IncomingCallEntry.updateCallerName(mContext, uuid, enrichedName)
                }
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
            TurboLog.i("Mattermost Notifications Signature verification", "Notification skipped because we could not verify it.")
            return
        }

        finishProcessingNotification(serverUrl, type, channelId, notificationId)
    }

    @OptIn(DelicateCoroutinesApi::class)
    override fun onPostRequest(notificationId: Int?): Int {
        val bundle = mNotificationProps.asBundle()
        val isDirect = when (val value = bundle.get("encma_direct")) {
            is String -> value == "true"
            is Boolean -> value
            else -> false
        }
        if (!isDirect) {
            return super.onPostRequest(notificationId)
        }

        // A post ID is stable across repeated WebSocket deliveries. Building
        // off the JS/native-modules thread also preserves the existing avatar
        // fetch behavior without blocking notification handling.
        val directNotificationId = NotificationHelper.getNotificationId(bundle)
        GlobalScope.launch {
            try {
                val createSummary = NotificationHelper.addNotificationToPreferences(
                    mContext,
                    directNotificationId,
                    bundle,
                )
                buildNotification(directNotificationId, createSummary)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
        return directNotificationId
    }

    override fun onOpened() {
        mNotificationProps?.let {
            digestNotification()
            NotificationHelper.clearChannelOrThreadNotifications(mContext, it.asBundle())
        }
    }

    private suspend fun finishProcessingNotification(serverUrl: String?, type: String?, channelId: String?, notificationId: Int) {
        val isReactInit = mAppLifecycleFacade.isReactInitialized()
        val bundle = mNotificationProps.asBundle()
        val currentActivityName = mAppLifecycleFacade.runningReactContext?.currentActivity?.componentName?.className ?: ""
        val isAppVisible = mAppLifecycleFacade.isAppVisible()
        val isMainActivity = currentActivityName.contains("MainActivity")
        TurboLog.i("CustomPushNotification", currentActivityName)

        when (type) {
            CustomPushNotificationHelper.PUSH_TYPE_MESSAGE -> {
                if (!isAppVisible || !isMainActivity) {
                    val createSummary = channelId?.let {
                        serverUrl?.let {
                            val notificationResult = dataHelper.fetchAndStoreDataForPushNotification(bundle, isReactInit)
                            notificationResult?.let { result ->
                                bundle.putBundle("data", result)
                                mNotificationProps = createProps(bundle)
                            }
                        }

                        NotificationHelper.addNotificationToPreferences(mContext, notificationId, bundle)
                    } ?: true
                    
                    buildNotification(notificationId, createSummary)
                }
            }
            CustomPushNotificationHelper.PUSH_TYPE_SESSION -> {
                val message = bundle.getString("message") ?: bundle.getString("body")
                if (!message.isNullOrEmpty() && (!isAppVisible || !isMainActivity)) {
                    buildNotification(notificationId, false)
                }
            }
            CustomPushNotificationHelper.PUSH_TYPE_CLEAR -> NotificationHelper.clearChannelOrThreadNotifications(mContext, bundle)
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
