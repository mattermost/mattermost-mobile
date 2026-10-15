package com.mattermost.rnbeta

import android.app.Notification
import android.app.NotificationManager
import android.content.Context
import android.os.Bundle
import android.service.notification.StatusBarNotification

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry

import com.facebook.react.bridge.ReactContext
import com.mattermost.helpers.CustomPushNotificationHelper
import com.wix.reactnativenotifications.core.AppLaunchHelper
import com.wix.reactnativenotifications.core.AppLifecycleFacade
import com.wix.reactnativenotifications.core.JsIOHelper

import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Covers the production delivery path rather than the helper in isolation: a
 * missing or miscalled applyCallDeliveryFlags in CustomPushNotification would
 * leave the posted notification without FLAG_INSISTENT, and these tests read
 * the flag back off the notification the system actually received.
 */
@RunWith(AndroidJUnit4::class)
class CustomPushNotificationCallFlagsTest {

    /** The app is treated as backgrounded, which is when calls are pushed. */
    private class NotRunningFacade : AppLifecycleFacade {
        override fun isReactInitialized() = false
        override fun getRunningReactContext(): ReactContext? = null
        override fun isAppVisible() = false
        override fun isAppDestroyed() = false
        override fun addVisibilityListener(listener: AppLifecycleFacade.AppVisibilityListener) = Unit
        override fun removeVisibilityListener(listener: AppLifecycleFacade.AppVisibilityListener) = Unit
    }

    private lateinit var context: Context
    private lateinit var notificationManager: NotificationManager

    @Before
    fun setUp() {
        context = InstrumentationRegistry.getInstrumentation().targetContext
        notificationManager = context.getSystemService(NotificationManager::class.java)
        InstrumentationRegistry.getInstrumentation().uiAutomation.grantRuntimePermission(
            context.packageName, "android.permission.POST_NOTIFICATIONS"
        )
        notificationManager.cancelAll()
    }

    @After
    fun tearDown() {
        notificationManager.cancelAll()
    }

    private fun baseBundle() = Bundle().apply {
        putString("type", CustomPushNotificationHelper.PUSH_TYPE_MESSAGE)
        putString("version", "v2")
        putString("channel_id", "abc123channelidxxxxxxxxxxx")
        putString("sender_name", "TestCaller")
        putString("message", "CallInvite")
    }

    private fun post(bundle: Bundle, notificationId: Int) {
        CustomPushNotification(
            context, bundle, NotRunningFacade(), AppLaunchHelper(), JsIOHelper()
        ).buildNotification(notificationId, false)
    }

    /**
     * NotificationManagerService posts on its own worker handler, so a read
     * immediately after notify() races with it. Poll instead of sampling once.
     */
    private fun awaitPosted(notificationId: Int): StatusBarNotification? {
        val deadline = System.currentTimeMillis() + POST_TIMEOUT_MS
        while (System.currentTimeMillis() < deadline) {
            notificationManager.activeNotifications
                .firstOrNull { it.id == notificationId }
                ?.let { return it }
            Thread.sleep(POLL_INTERVAL_MS)
        }
        return null
    }

    private fun activeSummary() = notificationManager.activeNotifications.joinToString {
        "id=${it.id} channel=${it.notification.channelId} flags=${it.notification.flags}"
    }

    @Test
    fun postedCallNotificationIsInsistent() {
        val bundle = baseBundle().apply {
            putString("sub_type", CustomPushNotificationHelper.PUSH_SUB_TYPE_CALLS)
            putString("post_id", "p0stid0000000000000000000")
        }

        post(bundle, CALL_NOTIFICATION_ID)

        val sbn = awaitPosted(CALL_NOTIFICATION_ID)
        assertNotNull("Call notification was never posted; active = ${activeSummary()}", sbn)
        val notification = sbn!!.notification
        assertEquals(
            "Posted call notification is not on the call channel",
            CustomPushNotificationHelper.CHANNEL_CALL_ID, notification.channelId
        )
        assertEquals(
            "Posted call notification is not insistent, so it rings once",
            Notification.FLAG_INSISTENT, notification.flags and Notification.FLAG_INSISTENT
        )
    }

    @Test
    fun postedMessageNotificationIsNotInsistent() {
        val bundle = baseBundle().apply { putString("post_id", "p0stid0000000000000000001") }

        post(bundle, MESSAGE_NOTIFICATION_ID)

        val sbn = awaitPosted(MESSAGE_NOTIFICATION_ID)
        assertNotNull("Message notification was never posted; active = ${activeSummary()}", sbn)
        val notification = sbn!!.notification
        assertEquals(
            "Posted message notification should stay on the high-importance channel",
            CustomPushNotificationHelper.CHANNEL_HIGH_IMPORTANCE_ID, notification.channelId
        )
        assertEquals(
            "Message notification must not repeat its sound",
            0, notification.flags and Notification.FLAG_INSISTENT
        )
    }

    companion object {
        private const val POST_TIMEOUT_MS = 5000L
        private const val POLL_INTERVAL_MS = 50L
        private const val CALL_NOTIFICATION_ID = 918273645
        private const val MESSAGE_NOTIFICATION_ID = 918273646
    }
}
