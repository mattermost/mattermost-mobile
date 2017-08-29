package com.mattermost.rnbeta;

import android.content.Context;
import android.content.Intent;
import android.app.IntentService;
import android.os.Bundle;

import com.wix.reactnativenotifications.core.NotificationIntentAdapter;

public class NotificationDismissService extends IntentService {

    public NotificationDismissService() {
        super("notificationDismissService");
    }

    @Override
    protected void onHandleIntent(Intent intent) {
        Bundle bundle = NotificationIntentAdapter.extractPendingNotificationDataFromIntent(intent);
        int notificationId = intent.getIntExtra(CustomPushNotification.NOTIFICATION_ID, -1);
        String channelId = bundle.getString("channel_id");
        CustomPushNotification.clearNotification(notificationId, channelId);
    }
}
