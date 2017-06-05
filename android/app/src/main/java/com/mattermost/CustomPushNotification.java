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

import com.wix.reactnativenotifications.core.notification.PushNotification;
import com.wix.reactnativenotifications.core.AppLaunchHelper;
import com.wix.reactnativenotifications.core.AppLifecycleFacade;
import com.wix.reactnativenotifications.core.JsIOHelper;
import com.wix.reactnativenotifications.helpers.ApplicationBadgeHelper;

public class CustomPushNotification extends PushNotification {

    public CustomPushNotification(Context context, Bundle bundle, AppLifecycleFacade appLifecycleFacade, AppLaunchHelper appLaunchHelper, JsIOHelper jsIoHelper) {
        super(context, bundle, appLifecycleFacade, appLaunchHelper, jsIoHelper);
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
        notification.setContentTitle(title);
        String channelId = bundle.getString("channel_id");
        if (channelId != null) {
            notification.setGroup(channelId).setGroupSummary(true);
        }
        notification.setContentText(bundle.getString("message"));

        String largeIcon = bundle.getString("largeIcon");

        String subText = bundle.getString("subText");

        if (subText != null) {
            notification.setSubText(subText);
        }

        String numberString = bundle.getString("badge");
        if (numberString != null) {
            ApplicationBadgeHelper.instance.setApplicationIconBadgeNumber(mContext.getApplicationContext(), Integer.parseInt(numberString));
        }

        int smallIconResId;
        int largeIconResId;

        String smallIcon = bundle.getString("smallIcon");

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

        Bitmap largeIconBitmap = BitmapFactory.decodeResource(res, largeIconResId);

        if (largeIconResId != 0 && (largeIcon != null || Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP)) {
            notification.setLargeIcon(largeIconBitmap);
        }

        notification.setSmallIcon(smallIconResId);
        notification
                .setVisibility(Notification.VISIBILITY_PRIVATE)
                .setPriority(Notification.PRIORITY_HIGH);

        return notification;
    }
}
