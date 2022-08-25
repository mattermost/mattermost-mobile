package com.mattermost.rnbeta;

import android.content.Context;
import android.content.Intent;
import android.app.IntentService;
import android.os.Bundle;
import android.util.Log;

import com.mattermost.helpers.NotificationHelper;
import com.wix.reactnativenotifications.core.NotificationIntentAdapter;

public class NotificationDismissService extends IntentService {
    public NotificationDismissService() {
            super("notificationDismissService");
    }

    @Override
    protected void onHandleIntent(Intent intent) {
        final Context context = getApplicationContext();
        final Bundle bundle = NotificationIntentAdapter.extractPendingNotificationDataFromIntent(intent);

        NotificationHelper.dismissNotification(context, bundle);
        Log.i("ReactNative", "Dismiss notification");
    }
}
