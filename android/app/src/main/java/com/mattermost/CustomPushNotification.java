package com.mattermost;

import android.app.PendingIntent;
import android.content.Context;
import android.content.res.Resources;
import android.content.pm.ApplicationInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Bundle;
import android.os.Build;
import android.app.Notification;
import android.app.NotificationManager;
import java.util.LinkedHashMap;

import com.wix.reactnativenotifications.core.notification.PushNotification;
import com.wix.reactnativenotifications.core.AppLaunchHelper;
import com.wix.reactnativenotifications.core.AppLifecycleFacade;
import com.wix.reactnativenotifications.core.JsIOHelper;
import com.wix.reactnativenotifications.helpers.ApplicationBadgeHelper;

import static com.wix.reactnativenotifications.Defs.NOTIFICATION_RECEIVED_EVENT_NAME;

public class CustomPushNotification extends PushNotification {

    public static final int MESSAGE_NOTIFICATION_ID = 435345;
    public static final String GROUP_KEY_MESSAGES = "mm_group_key_messages";
    private static LinkedHashMap<String,Integer> channelIdToNotificationCount = new LinkedHashMap<String,Integer>();

    public CustomPushNotification(Context context, Bundle bundle, AppLifecycleFacade appLifecycleFacade, AppLaunchHelper appLaunchHelper, JsIOHelper jsIoHelper) {
        super(context, bundle, appLifecycleFacade, appLaunchHelper, jsIoHelper);
    }

    @Override
    public void onReceived() throws InvalidNotificationException {
        Bundle data = mNotificationProps.asBundle();
        final String channelId = data.getString("channel_id");
        final String type = data.getString("type");
        int notificationId = MESSAGE_NOTIFICATION_ID;
        if (channelId != null) {
            notificationId = channelId.hashCode();
            Object objCount = channelIdToNotificationCount.get(channelId);
            Integer count = 1;
            if (objCount != null) {
                count = (Integer)objCount + 1;
            }
            channelIdToNotificationCount.put(channelId, count);
        }

        if ("clear".equals(type)) {
            cancelNotification(data, notificationId);
        } else {
            super.postNotification(notificationId);
        }

        notifyReceivedToJS();
    }

    @Override
    protected void postNotification(int id, Notification notification) {
        if (!mAppLifecycleFacade.isAppVisible()) {
            super.postNotification(id, notification);
        }
    }

    @Override
    protected Notification.Builder getNotificationBuilder(PendingIntent intent) {
        final Resources res = mContext.getResources();
        String packageName = mContext.getPackageName();

        // First, get a builder initialized with defaults from the core class.
        final Notification.Builder notification = super.getNotificationBuilder(intent);
        Bundle bundle = mNotificationProps.asBundle();
        String title = bundle.getString("title");
        if (title == null) {
            ApplicationInfo appInfo = mContext.getApplicationInfo();
            title = mContext.getPackageManager().getApplicationLabel(appInfo).toString();
        }

        int notificationId = bundle.getString("channel_id").hashCode();
        String channelId = bundle.getString("channel_id");
        String message = bundle.getString("message");
        String subText = bundle.getString("subText");
        String numberString = bundle.getString("badge");
        String smallIcon = bundle.getString("smallIcon");
        String largeIcon = bundle.getString("largeIcon");

        int smallIconResId;
        int largeIconResId;

        if (smallIcon != null) {
            smallIconResId = res.getIdentifier(smallIcon, "mipmap", packageName);
        } else {
            smallIconResId = res.getIdentifier("ic_notification", "mipmap", packageName);
        }

        if (smallIconResId == 0) {
            smallIconResId = res.getIdentifier("ic_launcher", "mipmap", packageName);

            if (smallIconResId == 0) {
                smallIconResId = android.R.drawable.ic_dialog_info;
            }
        }

        if (largeIcon != null) {
            largeIconResId = res.getIdentifier(largeIcon, "mipmap", packageName);
        } else {
            largeIconResId = res.getIdentifier("ic_launcher", "mipmap", packageName);
        }

        if (numberString != null) {
            ApplicationBadgeHelper.instance.setApplicationIconBadgeNumber(mContext.getApplicationContext(), Integer.parseInt(numberString));
        }

        int numMessages = 0;
        Object objCount = channelIdToNotificationCount.get(channelId);
        if (objCount != null) {
            numMessages = (Integer)objCount;
        }

        notification
                .setContentTitle(title)
                .setContentText(message)
                .setGroupSummary(true)
                .setSmallIcon(smallIconResId)
                .setVisibility(Notification.VISIBILITY_PRIVATE)
                .setPriority(Notification.PRIORITY_HIGH);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            notification.setGroup(GROUP_KEY_MESSAGES);
        }

        if (numMessages > 1) {
            notification.setNumber(numMessages);
        }

        Bitmap largeIconBitmap = BitmapFactory.decodeResource(res, largeIconResId);
        if (largeIconResId != 0 && (largeIcon != null || Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP)) {
            notification.setLargeIcon(largeIconBitmap);
        }

        if (subText != null) {
            notification.setSubText(subText);
        }

        return notification;
    }

    private void notifyReceivedToJS() {
        mJsIOHelper.sendEventToJS(NOTIFICATION_RECEIVED_EVENT_NAME, mNotificationProps.asBundle(), mAppLifecycleFacade.getRunningReactContext());
    }

    private void cancelNotification(Bundle data, int notificationId) {
        final String channelId = data.getString("channel_id");

        String numberString = data.getString("badge");
        if (numberString != null) {
            ApplicationBadgeHelper.instance.setApplicationIconBadgeNumber(mContext.getApplicationContext(), Integer.parseInt(numberString));
        }

        channelIdToNotificationCount.remove(channelId);
        final NotificationManager notificationManager = (NotificationManager) mContext.getSystemService(Context.NOTIFICATION_SERVICE);
        notificationManager.cancel(notificationId);
    }
}
