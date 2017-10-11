package com.mattermost.rnbeta;

import android.content.Context;
import android.content.SharedPreferences;

public class NotificationPreferences {
    private static NotificationPreferences instance;

    public final String SHARED_NAME = "NotificationPreferences";
    public final String SOUND_PREF = "NotificationSound";
    public final String VIBRATE_PREF = "NotificationVibrate";
    public final String BLINK_PREF = "NotificationLights";

    private SharedPreferences mSharedPreferences;

    private NotificationPreferences(Context context) {
        mSharedPreferences = context.getSharedPreferences(SHARED_NAME, Context.MODE_PRIVATE);
    }

    public static NotificationPreferences getInstance(Context context) {
        if (instance == null) {
            instance = new NotificationPreferences(context);
        }

        return instance;
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

    public void setNotificationSound(String soundUri) {
        SharedPreferences.Editor editor = mSharedPreferences.edit();
        editor.putString(SOUND_PREF, soundUri);
        editor.commit();
    }

    public void setShouldVibrate(boolean vibrate) {
        SharedPreferences.Editor editor = mSharedPreferences.edit();
        editor.putBoolean(VIBRATE_PREF, vibrate);
        editor.commit();
    }

    public void setShouldBlink(boolean blink) {
        SharedPreferences.Editor editor = mSharedPreferences.edit();
        editor.putBoolean(BLINK_PREF, blink);
        editor.commit();
    }
}
