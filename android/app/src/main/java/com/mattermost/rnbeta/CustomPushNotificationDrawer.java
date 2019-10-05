package com.mattermost.rnbeta;

import android.content.Context;

import com.wix.reactnativenotifications.core.AppLaunchHelper;
import com.wix.reactnativenotifications.core.notificationdrawer.PushNotificationsDrawer;
import com.wix.reactnativenotifications.core.notificationdrawer.IPushNotificationsDrawer;
import com.wix.reactnativenotifications.core.notificationdrawer.INotificationsDrawerApplication;

import static com.wix.reactnativenotifications.Defs.LOGTAG;

public class CustomPushNotificationDrawer extends PushNotificationsDrawer {
    final protected Context mContext;
    final protected AppLaunchHelper mAppLaunchHelper;

   protected CustomPushNotificationDrawer(Context context, AppLaunchHelper appLaunchHelper) {
        super(context, appLaunchHelper);
        mContext = context;
        mAppLaunchHelper = appLaunchHelper;
    }

    @Override
    public void onAppInit() {
    }

    @Override
    public void onAppVisible() {
    }

    @Override
    public void onNotificationOpened() {
    }

    @Override
    public void onCancelAllLocalNotifications() {
        CustomPushNotification.clearAllNotifications(mContext);
        cancelAllScheduledNotifications();
    }
}
