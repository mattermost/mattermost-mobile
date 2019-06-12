package com.mattermost.rnbeta;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Person;
import android.app.Person.Builder;
import android.app.RemoteInput;
import android.content.Intent;
import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.res.Resources;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.media.AudioManager;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import android.provider.Settings.System;
import android.util.Log;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;

import com.wix.reactnativenotifications.core.notification.PushNotification;
import com.wix.reactnativenotifications.core.NotificationIntentAdapter;
import com.wix.reactnativenotifications.core.AppLaunchHelper;
import com.wix.reactnativenotifications.core.AppLifecycleFacade;
import com.wix.reactnativenotifications.core.JsIOHelper;
import com.wix.reactnativenotifications.helpers.ApplicationBadgeHelper;

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
        final String ackId = data.getString("ack_id");
        int notificationId = MESSAGE_NOTIFICATION_ID;

        if (ackId != null) {
            notificationReceiptDelivery(ackId, type);
        }

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
                if (!"clear".equals(type)) {
                    String senderName = getSenderName(data.getString("sender_name"), data.getString("channel_name"), data.getString("message"));
                    data.putLong("time", new Date().getTime());
                    data.putString("sender_name", senderName);
                    data.putString("sender_id", data.getString("sender_id"));
                }
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

        // First, get a builder initialized with defaults from the core class.
        final Notification.Builder notification = new Notification.Builder(mContext);

        // If Android Oreo or above we need to register a channel
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            String CHANNEL_ID = "channel_01";
            String CHANNEL_NAME = "Mattermost notifications";

            NotificationChannel channel = new NotificationChannel(CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH);
            channel.setShowBadge(true);

            final NotificationManager notificationManager = (NotificationManager) mContext.getSystemService(Context.NOTIFICATION_SERVICE);
            notificationManager.createNotificationChannel(channel);
            notification.setChannelId(CHANNEL_ID);
        }

        Bundle bundle = mNotificationProps.asBundle();

        String version = bundle.getString("version");
        String channelId = bundle.getString("channel_id");
        String channelName = bundle.getString("channel_name");
        String senderName = bundle.getString("sender_name");
        String senderId = bundle.getString("sender_id");
        String postId = bundle.getString("post_id");
        String badge = bundle.getString("badge");
        String smallIcon = bundle.getString("smallIcon");
        String largeIcon = bundle.getString("largeIcon");
        int notificationId = channelId != null ? channelId.hashCode() : MESSAGE_NOTIFICATION_ID;

        String title = null;
        if (version != null && version.equals("v2")) {
            title = channelName;
        } else {
            title = bundle.getString("title");
        }

        if (android.text.TextUtils.isEmpty(title)) {
            ApplicationInfo appInfo = mContext.getApplicationInfo();
            title = mContext.getPackageManager().getApplicationLabel(appInfo).toString();
        }

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

        if (badge != null) {
            int badgeCount = Integer.parseInt(badge);
            CustomPushNotification.badgeCount = badgeCount;
            notification.setNumber(badgeCount);
            ApplicationBadgeHelper.instance.setApplicationIconBadgeNumber(mContext.getApplicationContext(), CustomPushNotification.badgeCount);
        }

        if (android.text.TextUtils.isEmpty(senderName)) {
            senderName = getSenderName(senderName, channelName, bundle.getString("message"));
        }

        String personId = senderId;
        if (!android.text.TextUtils.isEmpty(channelName)) {
            personId = channelId;
        }

        Notification.MessagingStyle messagingStyle;
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
            messagingStyle = new Notification.MessagingStyle("");
        } else {
            Person sender = new Person.Builder()
                    .setKey(senderId)
                    .setName("")
                    .build();
            messagingStyle = new Notification.MessagingStyle(sender);
        }

        if (title != null && (!title.startsWith("@") || channelName != senderName)) {
            messagingStyle
                    .setConversationTitle(title);
        }

        List<Bundle> bundleArray = channelIdToNotification.get(channelId);
        List<Bundle> list;
        if (bundleArray != null) {
            list = new ArrayList<Bundle>(bundleArray);
        } else {
            list = new ArrayList<Bundle>();
            list.add(bundle);
        }

        int listCount = list.size() - 1;
        for (int i = listCount; i >= 0; i--) {
            Bundle data = list.get(i);
            String message = data.getString("message");
            String previousPersonName = getSenderName(data.getString("sender_name"), channelName, message);
            String previousPersonId = data.getString("sender_id");

            if (title == null || !android.text.TextUtils.isEmpty(previousPersonName)) {
                message = removeSenderFromMessage(previousPersonName, channelName, message);
            }

            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
                messagingStyle.addMessage(message, data.getLong("time"), previousPersonName);
            } else {
                Person sender = new Person.Builder()
                        .setKey(previousPersonId)
                        .setName(previousPersonName)
                        .build();
                messagingStyle.addMessage(message, data.getLong("time"), sender);
            }
        }

        notification
                .setContentIntent(intent)
                .setGroupSummary(true)
                .setStyle(messagingStyle)
                .setSmallIcon(smallIconResId)
                .setVisibility(Notification.VISIBILITY_PRIVATE)
                .setPriority(Notification.PRIORITY_HIGH)
                .setAutoCancel(true);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            notification.setBadgeIconType(Notification.BADGE_ICON_SMALL);
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
            Intent replyIntent = new Intent(mContext, NotificationReplyBroadcastReceiver.class);
            replyIntent.setAction(KEY_TEXT_REPLY);
            replyIntent.putExtra(NOTIFICATION_ID, notificationId);
            replyIntent.putExtra("pushNotification", bundle);
            PendingIntent replyPendingIntent = PendingIntent.getBroadcast(mContext, notificationId, replyIntent, PendingIntent.FLAG_UPDATE_CURRENT);

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

    private String getSenderName(String senderName, String channelName, String message) {
        if (senderName != null) {
            return senderName;
        } else if (channelName != null && channelName.startsWith("@")) {
            return channelName;
        }

        String name = message.split(":")[0];
        if (name != message) {
            return name;
        }

        return " ";
    }

    private String removeSenderFromMessage(String senderName, String channelName, String message) {
        String sender = String.format("%s", getSenderName(senderName, channelName, message));
        return message.replaceFirst(sender, "").replaceFirst(": ", "").trim();
    }

    private void notificationReceiptDelivery(String ackId, String type) {
        ReceiptDelivery.send(context, ackId, type);
    }
}
