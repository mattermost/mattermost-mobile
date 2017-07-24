package com.mattermost.rnbeta;

import android.content.Context;
import android.content.Intent;
import android.content.BroadcastReceiver;


public class NotificationDismissReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        int notificationId = intent.getIntExtra(CustomPushNotification.NOTIFICATION_ID, -1);
        CustomPushNotification.clearNotification(notificationId);
    }
}
