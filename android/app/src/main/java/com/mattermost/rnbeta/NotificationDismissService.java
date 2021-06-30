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
        final Integer notificationId = bundle.getString("post_id").hashCode();
        CustomPushNotification.cancelNotification(context, channelId, notificationId);
        Log.i("ReactNative", "Dismiss notification");
    }
}
