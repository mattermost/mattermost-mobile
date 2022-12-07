package com.mattermost.rnbeta;

import android.app.Notification;
import android.app.PendingIntent;
import android.content.Context;
import android.os.Bundle;
import android.text.TextUtils;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import java.util.Objects;

import com.mattermost.helpers.CustomPushNotificationHelper;
import com.mattermost.helpers.DatabaseHelper;
import com.mattermost.helpers.Network;
import com.mattermost.helpers.NotificationHelper;
import com.mattermost.helpers.PushNotificationDataHelper;
import com.mattermost.helpers.ResolvePromise;
import com.mattermost.share.ShareModule;
import com.wix.reactnativenotifications.core.NotificationIntentAdapter;
import com.wix.reactnativenotifications.core.notification.PushNotification;
import com.wix.reactnativenotifications.core.AppLaunchHelper;
import com.wix.reactnativenotifications.core.AppLifecycleFacade;
import com.wix.reactnativenotifications.core.JsIOHelper;
import static com.wix.reactnativenotifications.Defs.NOTIFICATION_RECEIVED_EVENT_NAME;

public class CustomPushNotification extends PushNotification {
    private final PushNotificationDataHelper dataHelper;

    public CustomPushNotification(Context context, Bundle bundle, AppLifecycleFacade appLifecycleFacade, AppLaunchHelper appLaunchHelper, JsIOHelper jsIoHelper) {
        super(context, bundle, appLifecycleFacade, appLaunchHelper, jsIoHelper);
        CustomPushNotificationHelper.createNotificationChannels(context);
        dataHelper = new PushNotificationDataHelper(context);

        try {
            Objects.requireNonNull(DatabaseHelper.Companion.getInstance()).init(context);
            Network.init(context);
            NotificationHelper.cleanNotificationPreferencesIfNeeded(context);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onReceived() {
        final Bundle initialData = mNotificationProps.asBundle();
        final String type = initialData.getString("type");
        final String ackId = initialData.getString("ack_id");
        final String postId = initialData.getString("post_id");
        final String channelId = initialData.getString("channel_id");
        final boolean isIdLoaded = initialData.getString("id_loaded") != null && initialData.getString("id_loaded").equals("true");
        int notificationId = NotificationHelper.getNotificationId(initialData);

        String serverUrl = addServerUrlToBundle(initialData);
        boolean isReactInit = mAppLifecycleFacade.isReactInitialized();

        if (ackId != null && serverUrl != null) {
            notificationReceiptDelivery(ackId, serverUrl, postId, type, isIdLoaded, new ResolvePromise() {
                @Override
                public void resolve(@Nullable Object value) {
                    if (isIdLoaded) {
                        Bundle response = (Bundle) value;
                        if (value != null) {
                            response.putString("server_url", serverUrl);
                            Bundle current = mNotificationProps.asBundle();
                            current.putAll(response);
                            mNotificationProps = createProps(current);
                        }
                    }
                }

                @Override
                public void reject(String code, String message) {
                    Log.e("ReactNative", code + ": " + message);
                }
            });
        }

        switch (type) {
            case CustomPushNotificationHelper.PUSH_TYPE_MESSAGE:
            case CustomPushNotificationHelper.PUSH_TYPE_SESSION:
                ShareModule shareModule = ShareModule.getInstance();
                String currentActivityName = shareModule != null ? shareModule.getCurrentActivityName() : "";
                Log.i("ReactNative", currentActivityName);
                if (!mAppLifecycleFacade.isAppVisible() || !currentActivityName.equals("MainActivity")) {
                    boolean createSummary = type.equals(CustomPushNotificationHelper.PUSH_TYPE_MESSAGE);
                    if (type.equals(CustomPushNotificationHelper.PUSH_TYPE_MESSAGE)) {
                        if (channelId != null) {
                            Bundle notificationBundle = mNotificationProps.asBundle();
                            if (serverUrl != null && !isReactInit) {
                                // We will only fetch the data related to the notification on the native side
                                // as updating the data directly to the db removes the wal & shm files needed
                                // by watermelonDB, if the DB is updated while WDB is running it causes WDB to
                                // detect the database as malformed, thus the app stop working and a restart is required.
                                // Data will be fetch from within the JS context instead.
                                dataHelper.fetchAndStoreDataForPushNotification(notificationBundle);
                            }
                            createSummary = NotificationHelper.addNotificationToPreferences(
                                    mContext,
                                    notificationId,
                                    notificationBundle
                            );
                        }
                    }

                    buildNotification(notificationId, createSummary);
                }
                break;
            case CustomPushNotificationHelper.PUSH_TYPE_CLEAR:
                NotificationHelper.clearChannelOrThreadNotifications(mContext, mNotificationProps.asBundle());
                break;
        }

        if (isReactInit) {
            notifyReceivedToJS();
        }
    }

    @Override
    public void onOpened() {
        if (mNotificationProps != null) {
            digestNotification();

            Bundle data = mNotificationProps.asBundle();
            NotificationHelper.clearChannelOrThreadNotifications(mContext, data);
        }
    }

    private void buildNotification(Integer notificationId, boolean createSummary) {
        final PendingIntent pendingIntent = NotificationIntentAdapter.createPendingNotificationIntent(mContext, mNotificationProps);
        final Notification notification = buildNotification(pendingIntent);
        if (createSummary) {
            final Notification summary = getNotificationSummaryBuilder(pendingIntent).build();
            super.postNotification(summary, notificationId + 1);
        }
        super.postNotification(notification, notificationId);
    }

    @Override
    protected NotificationCompat.Builder getNotificationBuilder(PendingIntent intent) {
        Bundle bundle = mNotificationProps.asBundle();
        return CustomPushNotificationHelper.createNotificationBuilder(mContext, intent, bundle, false);
    }

    protected NotificationCompat.Builder getNotificationSummaryBuilder(PendingIntent intent) {
        Bundle bundle = mNotificationProps.asBundle();
        return CustomPushNotificationHelper.createNotificationBuilder(mContext, intent, bundle, true);
    }

    private void notificationReceiptDelivery(String ackId, String serverUrl, String postId, String type, boolean isIdLoaded, ResolvePromise promise) {
        ReceiptDelivery.send(mContext, ackId, serverUrl, postId, type, isIdLoaded, promise);
    }

    private void notifyReceivedToJS() {
        mJsIOHelper.sendEventToJS(NOTIFICATION_RECEIVED_EVENT_NAME, mNotificationProps.asBundle(), mAppLifecycleFacade.getRunningReactContext());
    }

    private String addServerUrlToBundle(Bundle bundle) {
        String serverId = bundle.getString("server_id");
        String serverUrl;
        if (serverId == null) {
            serverUrl = Objects.requireNonNull(DatabaseHelper.Companion.getInstance()).getOnlyServerUrl();
        } else {
            serverUrl = Objects.requireNonNull(DatabaseHelper.Companion.getInstance()).getServerUrlForIdentifier(serverId);
        }

        if (!TextUtils.isEmpty(serverUrl)) {
            bundle.putString("server_url", serverUrl);
            mNotificationProps = createProps(bundle);
        }

        return serverUrl;
    }
}
