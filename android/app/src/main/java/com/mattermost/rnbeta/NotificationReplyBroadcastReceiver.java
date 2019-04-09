package com.mattermost.rnbeta;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.RemoteInput;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.res.Resources;
import android.os.Build;
import android.os.Bundle;
import android.support.annotation.Nullable;
import android.util.Log;
import java.io.IOException;

import okhttp3.Call;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

import com.mattermost.react_native_interface.ResolvePromise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableMap;
import com.oblador.keychain.KeychainModule;

import com.wix.reactnativenotifications.core.NotificationIntentAdapter;

public class NotificationReplyBroadcastReceiver extends BroadcastReceiver {
    private Context mContext;
    private Bundle bundle;
    private NotificationManager notificationManager;

    @Override
    public void onReceive(Context context, Intent intent) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
            mContext = context;
            bundle = NotificationIntentAdapter.extractPendingNotificationDataFromIntent(intent);
            notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

            final ReactApplicationContext reactApplicationContext = new ReactApplicationContext(context);
            final int notificationId = intent.getIntExtra(CustomPushNotification.NOTIFICATION_ID, -1);
            final CharSequence message = getReplyMessage(intent);
            final KeychainModule keychainModule = new KeychainModule(reactApplicationContext);

            keychainModule.getGenericPasswordForOptions(null, new ResolvePromise() {
                @Override
                public void resolve(@Nullable Object value) {
                    if (value instanceof Boolean && !(Boolean)value) {
                        String channelId = bundle.getString("channel_id");
                        onReplyFailed(notificationManager, notificationId, channelId);
                        return;
                    }

                    WritableMap map = (WritableMap) value;
                    if (map != null) {
                        String[] credentials = map.getString("password").split(",[ ]*");
                        String token = null;
                        String serverUrl = null;
                        if (credentials.length == 2) {
                            token = credentials[0];
                            serverUrl = credentials[1];

                        }

                        Log.i("ReactNative", String.format("URL=%s TOKEN=%s", serverUrl, token));
                        replyToMessage(serverUrl, token, notificationId, message);
                    }
                }
            });
        }
    }

    protected void replyToMessage(final String serverUrl, final String token, final int notificationId, final CharSequence message) {
        final String channelId = bundle.getString("channel_id");
        final String rootId = bundle.getString("post_id");

        if (token == null || serverUrl == null) {
            onReplyFailed(notificationManager, notificationId, channelId);
            return;
        }

        final OkHttpClient client = new OkHttpClient();
        final MediaType JSON = MediaType.parse("application/json; charset=utf-8");
        String json = buildReplyPost(channelId, rootId, message.toString());
        Log.i("ReactNative", String.format("JSON STRING %s", json));
        RequestBody body = RequestBody.create(JSON, json);
        Request request = new Request.Builder()
                .header("Authorization", String.format("Bearer %s", token))
                .header("Content-Type", "application/json")
                .url(String.format("%s/api/v4/posts", serverUrl.replaceAll("/$", "")))
                .post(body)
                .build();

        client.newCall(request).enqueue(new okhttp3.Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                Log.i("ReactNative", String.format("Reply with message %s FAILED exception %s", message, e.getMessage()));
                onReplyFailed(notificationManager, notificationId, channelId);
            }

            @Override
            public void onResponse(Call call, final Response response) throws IOException {
                if (response.isSuccessful()) {
                    onReplySuccess(notificationManager, notificationId, channelId);
                    Log.i("ReactNative", String.format("Reply with message %s", message));
                } else {
                    Log.i("ReactNative", String.format("Reply with message %s FAILED status %s BODY %s", message, response.code(), response.body().string()));
                    onReplyFailed(notificationManager, notificationId, channelId);
                }
            }
        });
    }

    protected String buildReplyPost(String channelId, String rootId, String message) {
        return "{"
                + "\"channel_id\": \"" + channelId + "\","
                + "\"message\": \"" + message + "\","
                + "\"root_id\": \"" + rootId + "\""
                + "}";
    }

    protected void onReplyFailed(NotificationManager notificationManager, int notificationId, String channelId) {
        String CHANNEL_ID = "Reply job";
        Resources res = mContext.getResources();
        String packageName = mContext.getPackageName();
        int smallIconResId = res.getIdentifier("ic_notification", "mipmap", packageName);

        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, CHANNEL_ID, NotificationManager.IMPORTANCE_LOW);
        notificationManager.createNotificationChannel(channel);
        Notification notification =
                new Notification.Builder(mContext, CHANNEL_ID)
                        .setContentTitle("Message failed to send.")
                        .setSmallIcon(smallIconResId)
                        .build();

        CustomPushNotification.clearNotification(mContext, notificationId, channelId);
        notificationManager.notify(notificationId, notification);
    }

    protected void onReplySuccess(NotificationManager notificationManager, int notificationId, String channelId) {
        notificationManager.cancel(notificationId);
        CustomPushNotification.clearNotification(mContext, notificationId, channelId);
    }

    private CharSequence getReplyMessage(Intent intent) {
        Bundle remoteInput = RemoteInput.getResultsFromIntent(intent);
        if (remoteInput != null) {
            return remoteInput.getCharSequence(CustomPushNotification.KEY_TEXT_REPLY);
        }
        return null;
    }
}
