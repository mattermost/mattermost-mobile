package com.mattermost.rnbeta;

import android.content.Context;
import android.content.Intent;
import android.app.IntentService;
import android.os.Bundle;

import com.mattermost.rnutils.helpers.NotificationHelper;
import com.mattermost.turbolog.TurboLog;
import com.wix.reactnativenotifications.core.NotificationIntentAdapter;

public class NotificationDismissService extends IntentService {
    public NotificationDismissService() {
            super("notificationDismissService");
    }

    @Override
    protected void onHandleIntent(Intent intent) {
        final Context context = getApplicationContext();
        final Bundle bundle = NotificationIntentAdapter.extractPendingNotificationDataFromIntent(intent);

        NotificationHelper.INSTANCE.dismissNotification(context, bundle);
        TurboLog.Companion.i("ReactNative", "Dismiss notification");
    }
}
