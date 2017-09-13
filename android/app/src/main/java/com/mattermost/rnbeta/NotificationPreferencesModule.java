package com.mattermost.rnbeta;

import android.app.Application;
import android.content.Context;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.os.Bundle;
import android.net.Uri;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

public class NotificationPreferencesModule extends ReactContextBaseJavaModule {
    private static NotificationPreferencesModule instance;
    private final MainApplication mApplication;
    private SharedPreferences mSharedPreferences;

    private final String SHARED_NAME = "NotificationPreferences";
    private final String SOUND_PREF = "NotificationSound";
    private final String VIBRATE_PREF = "NotificationVibrate";
    private final String BLINK_PREF = "NotificationLights";

    private NotificationPreferencesModule(MainApplication application, ReactApplicationContext reactContext) {
        super(reactContext);
        mApplication = application;
        Context context = mApplication.getApplicationContext();
        mSharedPreferences = context.getSharedPreferences(SHARED_NAME, Context.MODE_PRIVATE);
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
    public void getPreferences(final Promise promise) {
        try {
            Context context = mApplication.getApplicationContext();
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
            result.putString("defaultUri", Uri.decode(defaultUri.toString()));
            result.putString("selectedUri", getNotificationSound());
            result.putBoolean("shouldVibrate", getShouldVibrate());
            result.putBoolean("shouldBlink", getShouldBlink());
            result.putArray("sounds", sounds);

            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("no notification sounds found", e);
        }
    }

    @ReactMethod
    public void previewSound(String url) {
        Context context = mApplication.getApplicationContext();
        Uri uri = Uri.parse(url);
        Ringtone r = RingtoneManager.getRingtone(context, uri);
        r.play();
    }

    @ReactMethod
    public void setNotificationSound(String soundUri) {
        SharedPreferences.Editor editor = mSharedPreferences.edit();
        editor.putString(SOUND_PREF, soundUri);
        editor.commit();
    }

    @ReactMethod
    public void setShouldVibrate(boolean vibrate) {
        SharedPreferences.Editor editor = mSharedPreferences.edit();
        editor.putBoolean(VIBRATE_PREF, vibrate);
        editor.commit();
    }

    @ReactMethod
    public void setShouldBlink(boolean vibrate) {
        SharedPreferences.Editor editor = mSharedPreferences.edit();
        editor.putBoolean(BLINK_PREF, vibrate);
        editor.commit();
    }

    public String getNotificationSound() {
        return mSharedPreferences.getString(SOUND_PREF, null);
    }

    public boolean getShouldVibrate() {
        return mSharedPreferences.getBoolean(VIBRATE_PREF, true);
    }

    public boolean getShouldBlink() {
        return mSharedPreferences.getBoolean(BLINK_PREF, false);
    }
}
