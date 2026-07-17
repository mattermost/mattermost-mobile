package com.mattermost.rnbeta;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.mattermost.helpers.ConversationShortcutHelper;
import com.mattermost.helpers.CustomPushNotificationHelper;
import com.mattermost.helpers.Network;
import com.mattermost.helpers.NotificationConversationStore;
import com.mattermost.helpers.ResolvePromise;
import com.mattermost.rnutils.helpers.NotificationHelper;
import com.mattermost.turbolog.TurboLog;

/**
 * Handles Android Auto / messaging mark-as-read actions for notifications.
 */
public class NotificationMarkAsReadReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        final PendingResult pendingResult = goAsync();
        try {
            Bundle bundle = intent.getBundleExtra(CustomPushNotificationHelper.NOTIFICATION);
            if (bundle == null) {
                TurboLog.Companion.i("NotificationMarkAsReadReceiver", "Missing notification bundle");
                pendingResult.finish();
                return;
            }

            String serverUrl = bundle.getString("server_url");
            String channelId = bundle.getString("channel_id");
            if (serverUrl == null || channelId == null) {
                TurboLog.Companion.i("NotificationMarkAsReadReceiver", "Missing server_url or channel_id");
                pendingResult.finish();
                return;
            }

            Network.init(context);
            markChannelAsRead(context, bundle, serverUrl, channelId, pendingResult);
        } catch (Exception e) {
            e.printStackTrace();
            pendingResult.finish();
        }
    }

    private void clearLocalConversation(Context context, Bundle bundle) {
        NotificationHelper.INSTANCE.clearChannelOrThreadNotifications(context, bundle);
        NotificationConversationStore.INSTANCE.clearConversation(context, bundle);
        ConversationShortcutHelper.INSTANCE.removeShortcut(context, bundle);
    }

    private void markChannelAsRead(
            Context context,
            Bundle bundle,
            String serverUrl,
            String channelId,
            PendingResult pendingResult
    ) {
        WritableMap headers = Arguments.createMap();
        headers.putString("Content-Type", "application/json");

        WritableMap body = Arguments.createMap();
        body.putString("channel_id", channelId);
        body.putBoolean("collapsed_threads_supported", true);

        WritableMap options = Arguments.createMap();
        options.putMap("headers", headers);
        options.putMap("body", body);

        Network.post(serverUrl, "/api/v4/channels/members/me/view", options, new ResolvePromise() {
            private boolean isSuccessful(int statusCode) {
                return statusCode >= 200 && statusCode < 300;
            }

            private void finishReceiver() {
                pendingResult.finish();
            }

            @Override
            public void resolve(@Nullable Object value) {
                try {
                    if (value instanceof ReadableMap) {
                        ReadableMap response = (ReadableMap) value;
                        ReadableMap data = response.getMap("data");
                        if (data != null && data.hasKey("status_code") && !isSuccessful(data.getInt("status_code"))) {
                            TurboLog.Companion.i("NotificationMarkAsReadReceiver",
                                    String.format("Mark as read FAILED %s", data.getString("message")));
                            return;
                        }
                    }
                    clearLocalConversation(context, bundle);
                    TurboLog.Companion.i("NotificationMarkAsReadReceiver", "Mark as read SUCCESS");
                } finally {
                    finishReceiver();
                }
            }

            @Override
            public void reject(@NonNull Throwable reason) {
                TurboLog.Companion.i("NotificationMarkAsReadReceiver",
                        String.format("Mark as read FAILED %s", reason.getMessage()));
                finishReceiver();
            }

            @Override
            public void reject(@NonNull String code, String message) {
                TurboLog.Companion.i("NotificationMarkAsReadReceiver",
                        String.format("Mark as read FAILED status %s BODY %s", code, message));
                finishReceiver();
            }
        });
    }
}
