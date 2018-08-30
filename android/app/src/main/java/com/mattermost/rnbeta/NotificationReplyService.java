package com.mattermost.rnbeta;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.RemoteInput;
import android.content.Context;
import android.content.Intent;
import android.content.res.Resources;
import android.os.Build;
import android.os.Bundle;
import android.support.annotation.Nullable;
import android.util.Log;

import com.facebook.react.HeadlessJsTaskService;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.jstasks.HeadlessJsTaskConfig;


import com.wix.reactnativenotifications.core.NotificationIntentAdapter;

public class NotificationReplyService extends HeadlessJsTaskService {
    private Context mContext;

    @Override
    public void onCreate() {
        super.onCreate();
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            Context mContext = this.getApplicationContext();
            final Resources res = mContext.getResources();
            String packageName = mContext.getPackageName();
            int smallIconResId = res.getIdentifier("ic_notification", "mipmap", packageName);
            String CHANNEL_ID = "Reply job";
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, CHANNEL_ID, NotificationManager.IMPORTANCE_LOW);
            ((NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE)).createNotificationChannel(channel);
            Notification notification =
                    new Notification.Builder(mContext, CHANNEL_ID)
                            .setContentTitle("Replying to message")
                            .setContentText(packageName)
                            .setSmallIcon(smallIconResId)
                            .build();
            startForeground(1, notification);
        }

    }

    @Override
    protected @Nullable HeadlessJsTaskConfig getTaskConfig(Intent intent) {
        mContext = getApplicationContext();
        if (CustomPushNotification.KEY_TEXT_REPLY.equals(intent.getAction())) {
            CharSequence message = getReplyMessage(intent);

            Bundle bundle = NotificationIntentAdapter.extractPendingNotificationDataFromIntent(intent);
            String channelId = bundle.getString("channel_id");
            bundle.putCharSequence("text", message);
            bundle.putInt("msg_count", CustomPushNotification.getMessageCountInChannel(channelId));

            int notificationId = intent.getIntExtra(CustomPushNotification.NOTIFICATION_ID, -1);
            CustomPushNotification.clearNotification(mContext, notificationId, channelId);

            MainApplication app = (MainApplication) this.getApplication();
            app.replyFromPushNotification = true;
            Log.i("ReactNative", "Replying service");
            return new HeadlessJsTaskConfig(
                    "notificationReplied",
                    Arguments.fromBundle(bundle),
                    5000);

        }

        return null;
    }

    private CharSequence getReplyMessage(Intent intent) {
        Bundle remoteInput = RemoteInput.getResultsFromIntent(intent);
        if (remoteInput != null) {
            return remoteInput.getCharSequence(CustomPushNotification.KEY_TEXT_REPLY);
        }
        return null;
    }
}
