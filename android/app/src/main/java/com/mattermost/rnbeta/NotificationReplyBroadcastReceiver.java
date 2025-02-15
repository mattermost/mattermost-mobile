package com.mattermost.rnbeta;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.RemoteInput;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.app.Person;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;

import com.mattermost.helpers.*;
import com.mattermost.turbolog.TurboLog;
import com.wix.reactnativenotifications.core.NotificationIntentAdapter;
import com.wix.reactnativenotifications.core.notification.PushNotificationProps;

public class NotificationReplyBroadcastReceiver extends BroadcastReceiver {
    private Context mContext;
    private Bundle bundle;
    private NotificationManager notificationManager;

    @Override
    public void onReceive(Context context, Intent intent) {
        try {
            final CharSequence message = getReplyMessage(intent);
            if (message == null) {
                return;
            }

            mContext = context;
            bundle = intent.getBundleExtra(CustomPushNotificationHelper.NOTIFICATION);
            notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

            final int notificationId = intent.getIntExtra(CustomPushNotificationHelper.NOTIFICATION_ID, -1);
            final String serverUrl = bundle.getString("server_url");
            Network.init(context);
            if (serverUrl != null) {
                    replyToMessage(serverUrl, notificationId, message);
            } else {
                onReplyFailed(notificationId);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    protected void replyToMessage(final String serverUrl, final int notificationId, final CharSequence message) {
        final String channelId = bundle.getString("channel_id");
        final String postId = bundle.getString("post_id");
        String rootId = bundle.getString("root_id");
        if (android.text.TextUtils.isEmpty(rootId)) {
            rootId = postId;
        }

        if (serverUrl == null) {
            onReplyFailed(notificationId);
            return;
        }

        WritableMap headers = Arguments.createMap();
        headers.putString("Content-Type", "application/json");

        WritableMap body = Arguments.createMap();
        body.putString("channel_id", channelId);
        body.putString("message", message.toString());
        body.putString("root_id", rootId);

        WritableMap options = Arguments.createMap();
        options.putMap("headers", headers);
        options.putMap("body", body);

        String postsEndpoint = "/api/v4/posts?set_online=false";
        Network.post(serverUrl, postsEndpoint, options, new ResolvePromise() {
            private boolean isSuccessful(int statusCode) {
                return statusCode >= 200 && statusCode < 300;
            }
            @Override
            public void resolve(@Nullable Object value) {
                if (value != null) {
                    ReadableMap response = (ReadableMap)value;
                    ReadableMap data = response.getMap("data");
                    if (data != null && data.hasKey("status_code") && !isSuccessful(data.getInt("status_code"))) {
                        TurboLog.Companion.i("ReactNative", String.format("Reply FAILED exception %s", data.getString("message")));
                        onReplyFailed(notificationId);
                        return;
                    }
                    onReplySuccess(notificationId, message);
                    TurboLog.Companion.i("ReactNative", "Reply SUCCESS");
                } else {
                    TurboLog.Companion.i("ReactNative", "Reply FAILED resolved without value");
                    onReplyFailed(notificationId);
                }
            }

            @Override
            public void reject(@NonNull Throwable reason) {
                TurboLog.Companion.i("ReactNative", String.format("Reply FAILED exception %s", reason.getMessage()));
                onReplyFailed(notificationId);
            }

            @Override
            public void reject(@NonNull String code, String message) {
                TurboLog.Companion.i("ReactNative",
                        String.format("Reply FAILED status %s BODY %s", code, message)
                );
                onReplyFailed(notificationId);
            }
        });
    }

    protected void onReplyFailed(int notificationId) {
        recreateNotification(notificationId, "Message failed to send.");
    }

    protected void onReplySuccess(int notificationId, final CharSequence message) {
        recreateNotification(notificationId, message);
    }

    private void recreateNotification(int notificationId, final CharSequence message) {
        final PushNotificationProps notificationProps = new PushNotificationProps(bundle);
        final PendingIntent pendingIntent = NotificationIntentAdapter.createPendingNotificationIntent(mContext, notificationProps);
        NotificationCompat.Builder builder = CustomPushNotificationHelper.createNotificationBuilder(mContext, pendingIntent, bundle, false);
        Notification notification =  builder.build();
        NotificationCompat.MessagingStyle messagingStyle = NotificationCompat.MessagingStyle.extractMessagingStyleFromNotification(notification);
        assert messagingStyle != null;
        messagingStyle.addMessage(message, System.currentTimeMillis(), (Person)null);
        notification = builder.setStyle(messagingStyle).build();
        notificationManager.notify(notificationId, notification);
    }

    private CharSequence getReplyMessage(Intent intent) {
        Bundle remoteInput = RemoteInput.getResultsFromIntent(intent);
        if (remoteInput != null) {
            return remoteInput.getCharSequence(CustomPushNotificationHelper.KEY_TEXT_REPLY);
        }
        return null;
    }
}
