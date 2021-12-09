package com.mattermost.rnbeta;

import android.content.Context;
import android.content.Intent;
import android.app.IntentService;
import android.os.Bundle;
import android.util.Log;

import com.wix.reactnativenotifications.core.NotificationIntentAdapter;

public class NotificationDismissService extends IntentService {
    public NotificationDismissService() {
            super("notificationDismissService");
    }

    @Override
    protected void onHandleIntent(Intent intent) {
        final Context context = getApplicationContext();
        final Bundle bundle = NotificationIntentAdapter.extractPendingNotificationDataFromIntent(intent);
        final String channelId = bundle.getString("channel_id");
        final String postId = bundle.getString("post_id");
        final String rootId = bundle.getString("root_id");
        final Boolean isCRTEnabled = bundle.getString("is_crt_enabled") != null && bundle.getString("is_crt_enabled").equals("true");

        int notificationId = CustomPushNotificationHelper.MESSAGE_NOTIFICATION_ID;
        if (postId != null) {
            notificationId = postId.hashCode();
        } else if (channelId != null) {
            notificationId = channelId.hashCode();
        }

        CustomPushNotification.cancelNotification(context, channelId, rootId, notificationId, isCRTEnabled);
        Log.i("ReactNative", "Dismiss notification");
    }
}
