package com.mattermost.rnbeta;

import android.app.Notification;
import android.app.NotificationManager;
import android.content.Context;
import android.database.Cursor;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.os.Bundle;
import android.net.Uri;
import android.service.notification.StatusBarNotification;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

public class NotificationPreferencesModule extends ReactContextBaseJavaModule {
    private static NotificationPreferencesModule instance;
    private final MainApplication mApplication;
    private final NotificationPreferences mNotificationPreference;

    private NotificationPreferencesModule(MainApplication application, ReactApplicationContext reactContext) {
        super(reactContext);
        mApplication = application;
        mNotificationPreference = NotificationPreferences.getInstance(reactContext);
    }

    public static NotificationPreferencesModule getInstance(MainApplication application, ReactApplicationContext reactContext) {
        if (instance == null) {
            instance = new NotificationPreferencesModule(application, reactContext);
        }

        return instance;
    }

    public static NotificationPreferencesModule getInstance() {
        return instance;
    }

    @Override
    @NonNull
    public String getName() {
        return "NotificationPreferences";
    }

    @ReactMethod
    public void getPreferences(final Promise promise) {
        try {
            final Context context = mApplication.getApplicationContext();
            RingtoneManager manager = new RingtoneManager(context);
            manager.setType(RingtoneManager.TYPE_NOTIFICATION);
            Cursor cursor = manager.getCursor();

            WritableMap result = Arguments.createMap();
            WritableArray sounds = Arguments.createArray();
            while (cursor.moveToNext()) {
                String notificationTitle = cursor.getString(RingtoneManager.TITLE_COLUMN_INDEX);
                String notificationId = cursor.getString(RingtoneManager.ID_COLUMN_INDEX);
                String notificationUri = cursor.getString(RingtoneManager.URI_COLUMN_INDEX);

                WritableMap map = Arguments.createMap();
                map.putString("name", notificationTitle);
                map.putString("uri", (notificationUri + "/" + notificationId));
                sounds.pushMap(map);
            }

            Uri defaultUri = RingtoneManager.getActualDefaultRingtoneUri(context, RingtoneManager.TYPE_NOTIFICATION);
            if (defaultUri != null) {
                result.putString("defaultUri", Uri.decode(defaultUri.toString()));
            }
            result.putString("selectedUri", mNotificationPreference.getNotificationSound());
            result.putBoolean("shouldVibrate", mNotificationPreference.getShouldVibrate());
            result.putBoolean("shouldBlink", mNotificationPreference.getShouldBlink());
            result.putArray("sounds", sounds);

            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("no notification sounds found", e);
        }
    }

    @ReactMethod
    public void previewSound(String url) {
        final Context context = mApplication.getApplicationContext();
        Uri uri = Uri.parse(url);
        Ringtone r = RingtoneManager.getRingtone(context, uri);
        r.play();
    }

    @ReactMethod
    public void setNotificationSound(String soundUri) {
        mNotificationPreference.setNotificationSound(soundUri);
    }

    @ReactMethod
    public void setShouldVibrate(boolean vibrate) {
        mNotificationPreference.setShouldVibrate(vibrate);
    }

    @ReactMethod
    public void setShouldBlink(boolean blink) {
        mNotificationPreference.setShouldBlink(blink);
    }

    @ReactMethod
    public void getDeliveredNotifications(final Promise promise) {
        final Context context = mApplication.getApplicationContext();
        final NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        StatusBarNotification[] statusBarNotifications = notificationManager.getActiveNotifications();
        WritableArray result = Arguments.createArray();
        for (StatusBarNotification sbn:statusBarNotifications) {
            WritableMap map = Arguments.createMap();
            Notification n = sbn.getNotification();
            Bundle bundle = n.extras;
            String postId = bundle.getString("post_id");
            map.putString("post_id", postId);
            String rootId = bundle.getString("root_id");
            map.putString("root_id", rootId);
            String channelId = bundle.getString("channel_id");
            map.putString("channel_id", channelId);
            result.pushMap(map);
        }
        promise.resolve(result);
    }

    @ReactMethod
    public void removeDeliveredNotifications(String channelId, String rootId, Boolean isCRTEnabled) {
        final Context context = mApplication.getApplicationContext();
        CustomPushNotification.clearChannelNotifications(context, channelId, rootId, isCRTEnabled);
    }

}
