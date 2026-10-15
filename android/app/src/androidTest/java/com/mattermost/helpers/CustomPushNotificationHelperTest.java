package com.mattermost.helpers;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.Context;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Bundle;

import androidx.core.app.NotificationCompat;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class CustomPushNotificationHelperTest {

    private static Bundle bundleWithSubType(String subType) {
        Bundle bundle = new Bundle();
        bundle.putString("type", CustomPushNotificationHelper.PUSH_TYPE_MESSAGE);
        if (subType != null) {
            bundle.putString("sub_type", subType);
        }
        return bundle;
    }

    @Test
    public void isCallsNotification_trueForCallsSubType() {
        assertTrue(CustomPushNotificationHelper.isCallsNotification(
                bundleWithSubType(CustomPushNotificationHelper.PUSH_SUB_TYPE_CALLS)));
    }

    @Test
    public void isCallsNotification_falseForOtherSubType() {
        assertFalse(CustomPushNotificationHelper.isCallsNotification(bundleWithSubType("something_else")));
    }

    @Test
    public void isCallsNotification_falseWhenSubTypeAbsent() {
        assertFalse(CustomPushNotificationHelper.isCallsNotification(bundleWithSubType(null)));
    }

    @Test
    public void isCallsNotification_falseForEmptyBundle() {
        assertFalse(CustomPushNotificationHelper.isCallsNotification(new Bundle()));
    }

    /**
     * Asserts the channel is created with the properties this change relies on.
     * These are creation-time defaults: once the channel exists, the user can
     * change sound, vibration and importance from system settings, and Android
     * keeps their values on subsequent createNotificationChannel calls.
     */
    @Test
    public void createNotificationChannels_createsIncomingCallsChannel() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        CustomPushNotificationHelper.createNotificationChannels(context);

        NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
        NotificationChannel channel =
                notificationManager.getNotificationChannel(CustomPushNotificationHelper.CHANNEL_CALL_ID);

        assertNotNull("Incoming Calls channel was not created", channel);
        assertEquals(NotificationManager.IMPORTANCE_HIGH, channel.getImportance());
        assertTrue("Incoming Calls channel does not vibrate", channel.shouldVibrate());
    }

    /**
     * The ringtone is looked up by name at runtime because res/raw is generated
     * by scripts/postinstall.sh. A failed lookup leaves the channel on the
     * system default notification sound, which is still non-null — so assert the
     * sound actually resolves to this package's own resource, and that it is
     * flagged as a ringtone rather than a notification blip.
     */
    @Test
    public void createNotificationChannels_incomingCallsChannelUsesBundledRingtone() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        CustomPushNotificationHelper.createNotificationChannels(context);

        NotificationChannel channel = context.getSystemService(NotificationManager.class)
                .getNotificationChannel(CustomPushNotificationHelper.CHANNEL_CALL_ID);
        assertNotNull(channel);

        Uri sound = channel.getSound();
        assertNotNull("Incoming Calls channel has no sound", sound);
        assertEquals("Ringtone is not a bundled resource", "android.resource", sound.getScheme());
        assertEquals("Ringtone does not belong to this package",
                context.getPackageName(), sound.getAuthority());
        assertEquals("Ringtone is addressed by numeric id rather than by name",
                "/raw/calls_calm", sound.getPath());

        AudioAttributes attributes = channel.getAudioAttributes();
        assertNotNull("Incoming Calls channel has no audio attributes", attributes);
        assertEquals("Ringtone is not flagged as a ringtone",
                AudioAttributes.USAGE_NOTIFICATION_RINGTONE, attributes.getUsage());
    }

    /**
     * The ringtone resource must be resolvable by name; if postinstall did not
     * run, the channel silently falls back to the system sound.
     */
    @Test
    public void ringtoneResourceIsBundled() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        int resId = context.getResources().getIdentifier("calls_calm", "raw", context.getPackageName());
        assertTrue("calls_calm is missing from res/raw", resId != 0);
    }

    /**
     * Regression guard: a plain message notification must keep using the
     * existing high-importance channel, not the new call channel.
     */
    @Test
    public void createNotificationChannels_leavesHighImportanceChannelForMessages() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        CustomPushNotificationHelper.createNotificationChannels(context);

        NotificationChannel channel = context.getSystemService(NotificationManager.class)
                .getNotificationChannel(CustomPushNotificationHelper.CHANNEL_HIGH_IMPORTANCE_ID);
        assertNotNull("High Importance channel was not created", channel);
        assertFalse("Message channel should not be the call channel",
                CustomPushNotificationHelper.CHANNEL_CALL_ID.equals(channel.getId()));
    }

    private static PendingIntent noopIntent(Context context) {
        return PendingIntent.getActivity(context, 0, new Intent(Intent.ACTION_VIEW),
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private static Bundle callBundle() {
        Bundle bundle = bundleWithSubType(CustomPushNotificationHelper.PUSH_SUB_TYPE_CALLS);
        bundle.putString("channel_id", "abc123channelidxxxxxxxxxxx");
        bundle.putString("post_id", "p0stid0000000000000000000");
        bundle.putString("sender_name", "TestCaller");
        bundle.putString("message", "is inviting you to a call");
        return bundle;
    }

    /**
     * The ringtone alone is not enough — the notification has to carry a
     * full-screen intent so it can show over the lock screen like a call.
     */
    @Test
    public void createNotificationBuilder_callNotificationIsAFullScreenCall() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();

        NotificationCompat.Builder builder = CustomPushNotificationHelper.createNotificationBuilder(
                context, noopIntent(context), callBundle(), false);
        Notification notification = builder.build();

        assertEquals("Call notification is not on the call channel",
                CustomPushNotificationHelper.CHANNEL_CALL_ID, notification.getChannelId());
        assertEquals("Call notification is not categorised as a call",
                Notification.CATEGORY_CALL, notification.category);
        assertNotNull("Call notification has no full-screen intent", notification.fullScreenIntent);
    }

    /**
     * Regression guard: an ordinary message must not acquire a full-screen
     * intent or the call category.
     */
    @Test
    public void createNotificationBuilder_messageNotificationIsUnchanged() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();

        Bundle bundle = bundleWithSubType(null);
        bundle.putString("channel_id", "abc123channelidxxxxxxxxxxx");
        bundle.putString("post_id", "p0stid0000000000000000001");
        bundle.putString("sender_name", "TestSender");
        bundle.putString("message", "hello");

        Notification notification = CustomPushNotificationHelper.createNotificationBuilder(
                context, noopIntent(context), bundle, false).build();

        assertEquals("Message notification should stay on the high-importance channel",
                CustomPushNotificationHelper.CHANNEL_HIGH_IMPORTANCE_ID, notification.getChannelId());
        assertEquals("Message notification should stay categorised as a message",
                Notification.CATEGORY_MESSAGE, notification.category);
        assertNull("Message notification must not get a full-screen intent",
                notification.fullScreenIntent);
    }

    /**
     * The group summary is built from the same bundle as the call notification.
     * It must not ring or take over the screen as well.
     */
    @Test
    public void createNotificationBuilder_groupSummaryIsNotTreatedAsACall() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();

        Notification summary = CustomPushNotificationHelper.createNotificationBuilder(
                context, noopIntent(context), callBundle(), true).build();

        assertEquals("Group summary should not be on the call channel",
                CustomPushNotificationHelper.CHANNEL_HIGH_IMPORTANCE_ID, summary.getChannelId());
        assertNull("Group summary must not get a full-screen intent", summary.fullScreenIntent);
    }

    /**
     * CustomPushNotification marks call notifications insistent so the channel
     * sound repeats instead of playing once. That class needs the react-native
     * lifecycle facade to construct, so assert the contract it relies on: the
     * call notification it is handed is the one isCallsNotification() selects,
     * and the flag it sets does survive on the built notification.
     */
    @Test
    public void callNotificationCanBeMarkedInsistent() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();

        Bundle bundle = callBundle();
        assertTrue("Call bundle is not recognised as a call",
                CustomPushNotificationHelper.isCallsNotification(bundle));

        Notification notification = CustomPushNotificationHelper.createNotificationBuilder(
                context, noopIntent(context), bundle, false).build();
        assertEquals("Builder should not set the insistent flag itself",
                0, notification.flags & Notification.FLAG_INSISTENT);

        notification.flags = notification.flags | Notification.FLAG_INSISTENT;
        assertEquals("Insistent flag did not stick on the built notification",
                Notification.FLAG_INSISTENT, notification.flags & Notification.FLAG_INSISTENT);
    }
}
