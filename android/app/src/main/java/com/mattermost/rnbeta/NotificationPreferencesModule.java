package com.mattermost.rnbeta;

import android.app.Notification;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Bundle;
import android.service.notification.StatusBarNotification;

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

    private NotificationPreferencesModule(MainApplication application, ReactApplicationContext reactContext) {
        super(reactContext);
        mApplication = application;
        Context context = mApplication.getApplicationContext();
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
    public String getName() {
        return "NotificationPreferences";
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
            String channelId = bundle.getString("channel_id");
            map.putString("channel_id", channelId);
            result.pushMap(map);
        }
        promise.resolve(result);
    }

    @ReactMethod
    public void removeDeliveredNotifications(String channelId) {
        Context context = mApplication.getApplicationContext();
        CustomPushNotification.clearChannelNotifications(context, channelId);
    }
}
