package com.mattermost.rnbeta;

import android.app.Notification;
import android.content.Context;
import android.os.Bundle;
import android.service.notification.StatusBarNotification;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.mattermost.helpers.NotificationHelper;

import java.util.Set;

public class NotificationsModule extends ReactContextBaseJavaModule {
    private static NotificationsModule instance;
    private final MainApplication mApplication;

    private NotificationsModule(MainApplication application, ReactApplicationContext reactContext) {
        super(reactContext);
        mApplication = application;
    }

    public static NotificationsModule getInstance(MainApplication application, ReactApplicationContext reactContext) {
        if (instance == null) {
            instance = new NotificationsModule(application, reactContext);
        }

        return instance;
    }

    @NonNull
    @Override
    public String getName() {
        return "Notifications";
    }

    @ReactMethod
    public void getDeliveredNotifications(final Promise promise) {
        Context context = mApplication.getApplicationContext();
        StatusBarNotification[] notifications = NotificationHelper.getDeliveredNotifications(context);
        WritableArray result = Arguments.createArray();
        for (StatusBarNotification sbn:notifications) {
            WritableMap map = Arguments.createMap();
            Notification n = sbn.getNotification();
            Bundle bundle = n.extras;
            Set<String> keys = bundle.keySet();
            for (String key: keys) {
                map.putString(key, bundle.getString(key));
            }
            result.pushMap(map);
        }
        promise.resolve(result);
    }

    @ReactMethod
    public void removeChannelNotifications(String serverUrl, String channelId) {
        Context context = mApplication.getApplicationContext();
        NotificationHelper.removeChannelNotifications(context, serverUrl, channelId);
    }

    @ReactMethod
    public void removeThreadNotifications(String serverUrl, String threadId) {
        Context context = mApplication.getApplicationContext();
        NotificationHelper.removeThreadNotifications(context, serverUrl, threadId);
    }

    @ReactMethod
    public void removeServerNotifications(String serverUrl) {
        Context context = mApplication.getApplicationContext();
        NotificationHelper.removeServerNotifications(context, serverUrl);
    }
}
