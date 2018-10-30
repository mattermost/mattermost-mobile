package com.mattermost.rnbeta;

import android.app.PendingIntent;
import android.app.NotificationChannel;
import android.content.Intent;
import android.content.Context;
import android.content.res.Resources;
import android.content.pm.ApplicationInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.media.AudioManager;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import android.app.Notification;
import android.app.NotificationManager;
import android.app.RemoteInput;
import android.provider.Settings.System;
import java.util.LinkedHashMap;
import java.util.Collections;
import java.util.ArrayList;
import java.util.List;
import java.lang.reflect.Field;

import com.wix.reactnativenotifications.core.notification.PushNotification;
import com.wix.reactnativenotifications.core.NotificationIntentAdapter;
import com.wix.reactnativenotifications.core.AppLaunchHelper;
import com.wix.reactnativenotifications.core.AppLifecycleFacade;
import com.wix.reactnativenotifications.core.JsIOHelper;
import com.wix.reactnativenotifications.helpers.ApplicationBadgeHelper;

import android.util.Log;

import static com.wix.reactnativenotifications.Defs.NOTIFICATION_RECEIVED_EVENT_NAME;

public class CustomPushNotification extends PushNotification {

    public static final int MESSAGE_NOTIFICATION_ID = 435345;
    public static final String GROUP_KEY_MESSAGES = "mm_group_key_messages";
    public static final String NOTIFICATION_ID = "notificationId";
    public static final String KEY_TEXT_REPLY = "CAN_REPLY";
    public static final String NOTIFICATION_REPLIED_EVENT_NAME = "notificationReplied";

    private static LinkedHashMap<String,Integer> channelIdToNotificationCount = new LinkedHashMap<String,Integer>();
    private static LinkedHashMap<String,List<Bundle>> channelIdToNotification = new LinkedHashMap<String,List<Bundle>>();
    private static AppLifecycleFacade lifecycleFacade;
    private static Context context;
    private static int badgeCount = 0;

    public CustomPushNotification(Context context, Bundle bundle, AppLifecycleFacade appLifecycleFacade, AppLaunchHelper appLaunchHelper, JsIOHelper jsIoHelper) {
        super(context, bundle, appLifecycleFacade, appLaunchHelper, jsIoHelper);
        this.context = context;
    }

    public static void clearNotification(Context mContext, int notificationId, String channelId) {
        if (notificationId != -1) {
           Object objCount = channelIdToNotificationCount.get(channelId);
            Integer count = -1;

            if (objCount != null) {
                count = (Integer)objCount;
            }

            channelIdToNotificationCount.remove(channelId);
            channelIdToNotification.remove(channelId);

            if (mContext != null) {
                final NotificationManager notificationManager = (NotificationManager) mContext.getSystemService(Context.NOTIFICATION_SERVICE);
                notificationManager.cancel(notificationId);

                if (count != -1) {
                    int total = CustomPushNotification.badgeCount - count;
                    int badgeCount = total < 0 ? 0 : total;
                    ApplicationBadgeHelper.instance.setApplicationIconBadgeNumber(mContext.getApplicationContext(), badgeCount);
                    CustomPushNotification.badgeCount = badgeCount;
                }
            }
        }
    }

    public static void clearAllNotifications(Context mContext) {
        channelIdToNotificationCount.clear();
        channelIdToNotification.clear();
        if (mContext != null) {
            final NotificationManager notificationManager = (NotificationManager) mContext.getSystemService(Context.NOTIFICATION_SERVICE);
            notificationManager.cancelAll();
            ApplicationBadgeHelper.instance.setApplicationIconBadgeNumber(mContext.getApplicationContext(), 0);
        }
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

            Object bundleArray = channelIdToNotification.get(channelId);
            List list = null;
            if (bundleArray == null) {
                list = Collections.synchronizedList(new ArrayList(0));
            } else {
                list = Collections.synchronizedList((List)bundleArray);
            }
            synchronized (list) {
                list.add(0, data);
                channelIdToNotification.put(channelId, list);
            }
        }

        if ("clear".equals(type)) {
            cancelNotification(data, notificationId);
        } else {
            super.postNotification(notificationId);
        }

        notifyReceivedToJS();
    }

    @Override
    public void onOpened() {
        Bundle data = mNotificationProps.asBundle();
        final String channelId = data.getString("channel_id");
        channelIdToNotificationCount.remove(channelId);
        channelIdToNotification.remove(channelId);
        digestNotification();
    }

    @Override
    protected void postNotification(int id, Notification notification) {
        boolean force = false;
        Bundle bundle = notification.extras;
        if (bundle != null) {
            force = bundle.getBoolean("localTest");
        }

        if (!mAppLifecycleFacade.isAppVisible() || force) {
            super.postNotification(id, notification);
        }
    }

    @Override
    protected Notification.Builder getNotificationBuilder(PendingIntent intent) {
        final Resources res = mContext.getResources();
        String packageName = mContext.getPackageName();
        NotificationPreferences notificationPreferences = NotificationPreferences.getInstance(mContext);

        String CHANNEL_ID = "channel_01";
        String CHANNEL_NAME = "Mattermost notifications";

        // First, get a builder initialized with defaults from the core class.
        final Notification.Builder notification = new Notification.Builder(mContext);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH);
            final NotificationManager notificationManager = (NotificationManager) mContext.getSystemService(Context.NOTIFICATION_SERVICE);
            notificationManager.createNotificationChannel(channel);
            notification.setChannelId(CHANNEL_ID);
        }
        Bundle bundle = mNotificationProps.asBundle();
        String version = bundle.getString("version");

        String title = null;
        if (version != null && version.equals("v2")) {
            title = bundle.getString("channel_name");
        } else {
            title = bundle.getString("title");
        }

        if (android.text.TextUtils.isEmpty(title)) {
            ApplicationInfo appInfo = mContext.getApplicationInfo();
            title = mContext.getPackageManager().getApplicationLabel(appInfo).toString();
        }

        String channelId = bundle.getString("channel_id");
        String postId = bundle.getString("post_id");
        int notificationId = channelId != null ? channelId.hashCode() : MESSAGE_NOTIFICATION_ID;
        String message = bundle.getString("message");
        String subText = bundle.getString("subText");
        String numberString = bundle.getString("badge");
        String smallIcon = bundle.getString("smallIcon");
        String largeIcon = bundle.getString("largeIcon");

        Bundle b = bundle.getBundle("userInfo");
        if (b == null) {
            b = new Bundle();
        }
        b.putString("channel_id", channelId);
        notification.addExtras(b);

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
            CustomPushNotification.badgeCount = Integer.parseInt(numberString);
            ApplicationBadgeHelper.instance.setApplicationIconBadgeNumber(mContext.getApplicationContext(), CustomPushNotification.badgeCount);
        }

        int numMessages = getMessageCountInChannel(channelId);

        notification
                .setContentIntent(intent)
                .setGroupSummary(true)
                .setSmallIcon(smallIconResId)
                .setVisibility(Notification.VISIBILITY_PRIVATE)
                .setPriority(Notification.PRIORITY_HIGH)
                .setAutoCancel(true);

        if (numMessages == 1) {
            notification
                    .setContentTitle(title)
                    .setContentText(message)
                    .setStyle(new Notification.BigTextStyle()
                            .bigText(message));
        } else {
            String summaryTitle = null;

            if (version != null && version.equals("v2")) {
                summaryTitle = String.format("(%d) %s", numMessages, title);
            } else {
                summaryTitle = String.format("%s (%d)", title, numMessages);
            }

            Notification.InboxStyle style = new Notification.InboxStyle();
            List<Bundle> bundleArray = channelIdToNotification.get(channelId);
            List<Bundle> list;
            if (bundleArray != null) {
                list = new ArrayList<Bundle>(bundleArray);
            } else {
                list = new ArrayList<Bundle>();
            }

            if (version != null && version.equals("v2")) {
                style.addLine(message);
            }

            for (Bundle data : list) {
                String msg = data.getString("message");
                if (msg != message) {
                    style.addLine(data.getString("message"));
                }
            }

            if (version != null && version.equals("v2")) {
                notification
                        .setContentTitle(summaryTitle)
                        .setContentText(message)
                        .setStyle(style);
            } else {
                style.setBigContentTitle(message)
                        .setSummaryText(String.format("+%d more", (numMessages - 1)));
                notification.setStyle(style)
                        .setContentTitle(summaryTitle);
            }
        }

        // Let's add a delete intent when the notification is dismissed
        Intent delIntent = new Intent(mContext, NotificationDismissService.class);
        delIntent.putExtra(NOTIFICATION_ID, notificationId);
        PendingIntent deleteIntent = NotificationIntentAdapter.createPendingNotificationIntent(mContext, delIntent, mNotificationProps);
        notification.setDeleteIntent(deleteIntent);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            notification.setGroup(GROUP_KEY_MESSAGES);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && postId != null) {
            Intent replyIntent = new Intent(mContext, NotificationReplyService.class);
            replyIntent.setAction(KEY_TEXT_REPLY);
            replyIntent.putExtra(NOTIFICATION_ID, notificationId);
            replyIntent.putExtra("pushNotification", bundle);
            PendingIntent replyPendingIntent;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                replyPendingIntent = PendingIntent.getForegroundService(mContext, notificationId, replyIntent, PendingIntent.FLAG_UPDATE_CURRENT);
            } else {
                replyPendingIntent = PendingIntent.getService(mContext, notificationId, replyIntent, PendingIntent.FLAG_UPDATE_CURRENT);
            }

            RemoteInput remoteInput = new RemoteInput.Builder(KEY_TEXT_REPLY)
                    .setLabel("Reply")
                    .build();

            Notification.Action replyAction = new Notification.Action.Builder(
                    R.drawable.ic_notif_action_reply, "Reply", replyPendingIntent)
                    .addRemoteInput(remoteInput)
                    .setAllowGeneratedReplies(true)
                    .build();

            notification
                    .setShowWhen(true)
                    .addAction(replyAction);
        }

        Bitmap largeIconBitmap = BitmapFactory.decodeResource(res, largeIconResId);
        if (largeIconResId != 0 && (largeIcon != null || Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP)) {
            notification.setLargeIcon(largeIconBitmap);
        }

        if (subText != null) {
            notification.setSubText(subText);
        }

        String soundUri = notificationPreferences.getNotificationSound();
        if (soundUri != null) {
            if (soundUri != "none") {
                notification.setSound(Uri.parse(soundUri), AudioManager.STREAM_NOTIFICATION);
            }
        } else {
            Uri defaultUri = System.DEFAULT_NOTIFICATION_URI;
            notification.setSound(defaultUri, AudioManager.STREAM_NOTIFICATION);
        }

        boolean vibrate = notificationPreferences.getShouldVibrate();
        if (vibrate) {
            // use the system default for vibration
            notification.setDefaults(Notification.DEFAULT_VIBRATE);
        }

        boolean blink = notificationPreferences.getShouldBlink();
        if (blink) {
            notification.setLights(Color.CYAN, 500, 500);
        }

        return notification;
    }

    private void notifyReceivedToJS() {
        mJsIOHelper.sendEventToJS(NOTIFICATION_RECEIVED_EVENT_NAME, mNotificationProps.asBundle(), mAppLifecycleFacade.getRunningReactContext());
    }

    public static Integer getMessageCountInChannel(String channelId) {
        Object objCount = channelIdToNotificationCount.get(channelId);
        if (objCount != null) {
            return (Integer)objCount;
        }

        return 1;
    }

    private void cancelNotification(Bundle data, int notificationId) {
        final String channelId = data.getString("channel_id");
        final String numberString = data.getString("badge");

        CustomPushNotification.badgeCount = Integer.parseInt(numberString);
        CustomPushNotification.clearNotification(mContext.getApplicationContext(), notificationId, channelId);

        ApplicationBadgeHelper.instance.setApplicationIconBadgeNumber(mContext.getApplicationContext(), CustomPushNotification.badgeCount);
    }
}
