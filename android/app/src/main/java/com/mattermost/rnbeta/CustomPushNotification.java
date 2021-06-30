package com.mattermost.rnbeta;

import android.app.PendingIntent;
import android.content.Context;
import android.os.Bundle;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.wix.reactnativenotifications.core.notification.PushNotification;
import com.wix.reactnativenotifications.core.AppLaunchHelper;
import com.wix.reactnativenotifications.core.AppLifecycleFacade;
import com.wix.reactnativenotifications.core.JsIOHelper;
import static com.wix.reactnativenotifications.Defs.NOTIFICATION_RECEIVED_EVENT_NAME;

import com.mattermost.react_native_interface.ResolvePromise;

public class CustomPushNotification extends PushNotification {
    private static final String PUSH_TYPE_MESSAGE = "message";
    private static final String PUSH_TYPE_CLEAR = "clear";
    private static final String PUSH_TYPE_SESSION = "session";

    private final static Map<String, List<Integer>> notificationsInChannel = new HashMap<>();

    public CustomPushNotification(Context context, Bundle bundle, AppLifecycleFacade appLifecycleFacade, AppLaunchHelper appLaunchHelper, JsIOHelper jsIoHelper) {
        super(context, bundle, appLifecycleFacade, appLaunchHelper, jsIoHelper);
        CustomPushNotificationHelper.createNotificationChannels(context);
    }

    public static void cancelNotification(Context context, String channelId, Integer notificationId) {
        if (!android.text.TextUtils.isEmpty(channelId)) {
            List<Integer> notifications = notificationsInChannel.get(channelId);
            if (notifications == null) {
                return;
            }

            notifications.remove(notificationId);
            final NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
            notificationManager.cancel(notificationId);
        }
    }

    public static void clearChannelNotifications(Context context, String channelId) {
        if (!android.text.TextUtils.isEmpty(channelId)) {
            List<Integer> notifications = notificationsInChannel.get(channelId);
            if (notifications == null) {
                return;
            }

            notificationsInChannel.remove(channelId);

            if (context != null) {
                for (final Integer notificationId : notifications) {
                    final NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
                    notificationManager.cancel(notificationId);
                }
            }
        }
    }

    public static void clearAllNotifications(Context context) {
        notificationsInChannel.clear();
        if (context != null) {
            final NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
            notificationManager.cancelAll();
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
        int notificationId = CustomPushNotificationHelper.MESSAGE_NOTIFICATION_ID;
        if (postId != null) {
            notificationId = postId.hashCode();
        } else if (channelId != null) {
            notificationId = channelId.hashCode();
        }

        if (ackId != null) {
            notificationReceiptDelivery(ackId, postId, type, isIdLoaded, new ResolvePromise() {
                @Override
                public void resolve(@Nullable Object value) {
                    if (isIdLoaded) {
                        Bundle response = (Bundle) value;
                        mNotificationProps = createProps(response);
                    }
                }

                @Override
                public void reject(String code, String message) {
                    Log.e("ReactNative", code + ": " + message);
                }
            });
        }

        if (channelId != null) {
            synchronized (notificationsInChannel) {
                List<Integer> list = notificationsInChannel.get(channelId);
                if (list == null) {
                    list = Collections.synchronizedList(new ArrayList(0));
                }

                list.add(0, notificationId);
                notificationsInChannel.put(channelId, list);
            }
        }

        switch (type) {
            case PUSH_TYPE_MESSAGE:
            case PUSH_TYPE_SESSION:
                super.postNotification(notificationId);
                break;
            case PUSH_TYPE_CLEAR:
                clearChannelNotifications(mContext, channelId);
                break;
        }

        if (mAppLifecycleFacade.isReactInitialized()) {
            notifyReceivedToJS();
        }
    }

    @Override
    public void onOpened() {
        digestNotification();

        Bundle data = mNotificationProps.asBundle();
        final String channelId = data.getString("channel_id");
        final Integer notificationId = data.getString("post_id").hashCode();
        if (channelId != null) {
            List<Integer> notifications = notificationsInChannel.get(channelId);
            notifications.remove(notificationId);
            clearChannelNotifications(mContext, channelId);
        }
    }

    @Override
    protected NotificationCompat.Builder getNotificationBuilder(PendingIntent intent) {
        Bundle bundle = mNotificationProps.asBundle();
        return CustomPushNotificationHelper.createNotificationBuilder(mContext, intent, bundle);
    }

    private void notificationReceiptDelivery(String ackId, String postId, String type, boolean isIdLoaded, ResolvePromise promise) {
        ReceiptDelivery.send(mContext, ackId, postId, type, isIdLoaded, promise);
    }

    private void notifyReceivedToJS() {
        mJsIOHelper.sendEventToJS(NOTIFICATION_RECEIVED_EVENT_NAME, mNotificationProps.asBundle(), mAppLifecycleFacade.getRunningReactContext());
    }
}
