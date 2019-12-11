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
import androidx.annotation.Nullable;
import android.util.Log;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.wix.reactnativenotifications.core.notification.PushNotification;
import com.wix.reactnativenotifications.core.NotificationIntentAdapter;
import com.wix.reactnativenotifications.core.AppLaunchHelper;
import com.wix.reactnativenotifications.core.AppLifecycleFacade;
import com.wix.reactnativenotifications.core.JsIOHelper;

import static com.wix.reactnativenotifications.Defs.NOTIFICATION_RECEIVED_EVENT_NAME;

import com.mattermost.react_native_interface.ResolvePromise;
import com.facebook.react.bridge.WritableMap;

public class CustomPushNotification extends PushNotification {
    public static final int MESSAGE_NOTIFICATION_ID = 435345;
    public static final String GROUP_KEY_MESSAGES = "mm_group_key_messages";
    public static final String NOTIFICATION_ID = "notificationId";
    public static final String KEY_TEXT_REPLY = "CAN_REPLY";
    public static final String NOTIFICATION_REPLIED_EVENT_NAME = "notificationReplied";

    private static final String PUSH_TYPE_MESSAGE = "message";
    private static final String PUSH_TYPE_CLEAR = "clear";
    private static final String PUSH_TYPE_UPDATE_BADGE = "update_badge";

    private NotificationChannel mHighImportanceChannel;
    private NotificationChannel mMinImportanceChannel;

    private static Map<String, Integer> channelIdToNotificationCount = new HashMap<String, Integer>();
    private static Map<String, List<Bundle>> channelIdToNotification = new HashMap<String, List<Bundle>>();
    private static AppLifecycleFacade lifecycleFacade;
    private static Context context;
    private static int badgeCount = 0;

    public CustomPushNotification(Context context, Bundle bundle, AppLifecycleFacade appLifecycleFacade, AppLaunchHelper appLaunchHelper, JsIOHelper jsIoHelper) {
        super(context, bundle, appLifecycleFacade, appLaunchHelper, jsIoHelper);
        this.context = context;
        createNotificationChannels();
    }

    public static void clearNotification(Context mContext, int notificationId, String channelId) {
        if (notificationId != -1) {
            Integer count = channelIdToNotificationCount.get(channelId);
            if (count == null) {
                count = -1;
            }

            channelIdToNotificationCount.remove(channelId);
            channelIdToNotification.remove(channelId);

            if (mContext != null) {
                final NotificationManager notificationManager = (NotificationManager) mContext.getSystemService(Context.NOTIFICATION_SERVICE);
                notificationManager.cancel(notificationId);

                if (count != -1) {
                    int total = CustomPushNotification.badgeCount - count;
                    int badgeCount = total < 0 ? 0 : total;
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
        }
    }

    @Override
    public void onReceived() throws InvalidNotificationException {
        final Bundle initialData = mNotificationProps.asBundle();
        final String type = initialData.getString("type");
        final String ackId = initialData.getString("ack_id");
        final String postId = initialData.getString("post_id");
        final String channelId = initialData.getString("channel_id");
        final boolean isIdLoaded = initialData.getString("id_loaded") != null ? initialData.getString("id_loaded").equals("true") : false;
        int notificationId = MESSAGE_NOTIFICATION_ID;

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

        // notificationReceiptDelivery can override mNotificationProps
        // so we fetch the bundle again
        final Bundle data = mNotificationProps.asBundle();

        if (channelId != null) {
            notificationId = channelId.hashCode();

            synchronized (channelIdToNotificationCount) {
                Integer count = channelIdToNotificationCount.get(channelId);
                if (count == null) {
                    count = 0;
                }

                count += 1;

                channelIdToNotificationCount.put(channelId, count);
            }

            synchronized (channelIdToNotification) {
                List<Bundle> list = channelIdToNotification.get(channelId);
                if (list == null) {
                    list = Collections.synchronizedList(new ArrayList(0));
                }

                if (PUSH_TYPE_MESSAGE.equals(type)) {
                    String senderName = getSenderName(data);
                    data.putLong("time", new Date().getTime());
                    data.putString("sender_name", senderName);
                    data.putString("sender_id", data.getString("sender_id"));
                }
                list.add(0, data);
                channelIdToNotification.put(channelId, list);
            }
        }

        switch(type) {
        case PUSH_TYPE_MESSAGE:
            super.postNotification(notificationId);
            break;
        case PUSH_TYPE_CLEAR:
            cancelNotification(data, notificationId);
            break;
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
    protected Notification.Builder getNotificationBuilder(PendingIntent intent) {
        // First, get a builder initialized with defaults from the core class.
        final Notification.Builder notification = new Notification.Builder(mContext);

        Bundle bundle = mNotificationProps.asBundle();

        addNotificationExtras(notification, bundle);
        setNotificationIcons(notification, bundle);
        setNotificationMessagingStyle(notification, bundle);
        setNotificationChannel(notification, bundle);
        setNotificationBadgeIconType(notification);

        NotificationPreferences notificationPreferences = NotificationPreferences.getInstance(mContext);
        setNotificationSound(notification, notificationPreferences);
        setNotificationVibrate(notification, notificationPreferences);
        setNotificationBlink(notification, notificationPreferences);

        String channelId = bundle.getString("channel_id");
        int notificationId = channelId != null ? channelId.hashCode() : MESSAGE_NOTIFICATION_ID;
        setNotificationNumber(notification, channelId);
        setNotificationDeleteIntent(notification, notificationId);
        addNotificationReplyAction(notification, notificationId, bundle);

        notification
            .setContentIntent(intent)
            .setVisibility(Notification.VISIBILITY_PRIVATE)
            .setPriority(Notification.PRIORITY_HIGH)
            .setAutoCancel(true);

        return notification;
    }

    private void addNotificationExtras(Notification.Builder notification, Bundle bundle) {
        Bundle userInfoBundle = bundle.getBundle("userInfo");
        if (userInfoBundle == null) {
            userInfoBundle = new Bundle();
        }

        String channelId = bundle.getString("channel_id");
        userInfoBundle.putString("channel_id", channelId);

        notification.addExtras(userInfoBundle);
    }

    private void setNotificationIcons(Notification.Builder notification, Bundle bundle) {
        String smallIcon = bundle.getString("smallIcon");
        String largeIcon = bundle.getString("largeIcon");

        int smallIconResId = getSmallIconResourceId(smallIcon);
        notification.setSmallIcon(smallIconResId);

        int largeIconResId = getLargeIconResourceId(largeIcon);
        final Resources res = mContext.getResources();
        Bitmap largeIconBitmap = BitmapFactory.decodeResource(res, largeIconResId);
        if (largeIconResId != 0 && (largeIconBitmap != null || Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP)) {
            notification.setLargeIcon(largeIconBitmap);
        }
    }

    private int getSmallIconResourceId(String iconName) {
        if (iconName == null) {
            iconName = "ic_notification";
        }

        int resourceId = getIconResourceId(iconName);

        if (resourceId == 0) {
            iconName = "ic_launcher";
            resourceId = getIconResourceId(iconName);

            if (resourceId == 0) {
                resourceId = android.R.drawable.ic_dialog_info;
            }
        }

        return resourceId;
    }

    private int getLargeIconResourceId(String iconName) {
        if (iconName == null) {
            iconName = "ic_launcher";
        }

        return getIconResourceId(iconName);
    }

    private int getIconResourceId(String iconName) {
        final Resources res = mContext.getResources();
        String packageName = mContext.getPackageName();
        String defType = "mipmap";

        return res.getIdentifier(iconName, defType, packageName);
    }

    private void setNotificationNumber(Notification.Builder notification, String channelId) {
        Integer number = channelIdToNotificationCount.get(channelId);
        if (number == null) {
            number = 0;
        }
        notification.setNumber(number);
    }

    private void setNotificationMessagingStyle(Notification.Builder notification, Bundle bundle) {
        Notification.MessagingStyle messagingStyle = getMessagingStyle(bundle);
        notification.setStyle(messagingStyle);
    }

    private Notification.MessagingStyle getMessagingStyle(Bundle bundle) {
        Notification.MessagingStyle messagingStyle;

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
            messagingStyle = new Notification.MessagingStyle("");
        } else {
            String senderId = bundle.getString("sender_id");
            Person sender = new Person.Builder()
                .setKey(senderId)
                .setName("")
                .build();
            messagingStyle = new Notification.MessagingStyle(sender);
        }

        String conversationTitle = getConversationTitle(bundle);
        setMessagingStyleConversationTitle(messagingStyle, conversationTitle, bundle);
        addMessagingStyleMessages(messagingStyle, conversationTitle, bundle);

        return messagingStyle;
    }

    private String getConversationTitle(Bundle bundle) {
        String title = null;

        String version = bundle.getString("version");
        if (version != null && version.equals("v2")) {
            title = bundle.getString("channel_name");
        } else {
            title = bundle.getString("title");
        }

        if (android.text.TextUtils.isEmpty(title)) {
            ApplicationInfo appInfo = mContext.getApplicationInfo();
            title = mContext.getPackageManager().getApplicationLabel(appInfo).toString();
        }

        return title;
    }

    private void setMessagingStyleConversationTitle(Notification.MessagingStyle messagingStyle, String conversationTitle, Bundle bundle) {
        String channelName = getConversationTitle(bundle);
        String senderName = bundle.getString("sender_name");
        if (android.text.TextUtils.isEmpty(senderName)) {
            senderName = getSenderName(bundle);
        }

        if (conversationTitle != null && (!conversationTitle.startsWith("@") || channelName != senderName)) {
            messagingStyle.setConversationTitle(conversationTitle);
        }
    }

    private void addMessagingStyleMessages(Notification.MessagingStyle messagingStyle, String conversationTitle, Bundle bundle) {
        List<Bundle> bundleList;

        String channelId = bundle.getString("channel_id");
        List<Bundle> bundleArray = channelIdToNotification.get(channelId);
        if (bundleArray != null) {
            bundleList = new ArrayList<Bundle>(bundleArray);
        } else {
            bundleList = new ArrayList<Bundle>();
            bundleList.add(bundle);
        }

        int bundleCount = bundleList.size() - 1;
        for (int i = bundleCount; i >= 0; i--) {
            Bundle data = bundleList.get(i);
            String message = data.getString("message");
            String senderId = data.getString("sender_id");
            if (senderId == null) {
                senderId = "sender_id";
            }
            Bundle userInfoBundle = data.getBundle("userInfo");
            String senderName = getSenderName(data);
            if (userInfoBundle != null) {
                boolean localPushNotificationTest = userInfoBundle.getBoolean("localTest");
                if (localPushNotificationTest) {
                    senderName = "Test";
                }
            }

            if (conversationTitle == null || !android.text.TextUtils.isEmpty(senderName.trim())) {
                message = removeSenderNameFromMessage(message, senderName);
            }

            long timestamp = data.getLong("time");
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
                messagingStyle.addMessage(message, timestamp, senderName);
            } else {
                Person sender = new Person.Builder()
                    .setKey(senderId)
                    .setName(senderName)
                    .build();
                messagingStyle.addMessage(message, timestamp, sender);
            }
        }
    }

    private void setNotificationChannel(Notification.Builder notification, Bundle bundle) {
        // If Android Oreo or above we need to register a channel
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationChannel notificationChannel = mHighImportanceChannel;

        boolean localPushNotificationTest = false;
        Bundle userInfoBundle = bundle.getBundle("userInfo");
        if (userInfoBundle != null) {
            localPushNotificationTest = userInfoBundle.getBoolean("localTest");
        }

        if (mAppLifecycleFacade.isAppVisible() && !localPushNotificationTest) {
            notificationChannel = mMinImportanceChannel;
        }

        notification.setChannelId(notificationChannel.getId());
    }

    private void setNotificationBadgeIconType(Notification.Builder notification) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            notification.setBadgeIconType(Notification.BADGE_ICON_SMALL);
        }
    }

    private void setNotificationGroup(Notification.Builder notification) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            notification
                .setGroup(GROUP_KEY_MESSAGES)
                .setGroupSummary(true);
        }
    }

    private void setNotificationSound(Notification.Builder notification, NotificationPreferences notificationPreferences) {
        String soundUri = notificationPreferences.getNotificationSound();
        if (soundUri != null) {
            if (soundUri != "none") {
                notification.setSound(Uri.parse(soundUri), AudioManager.STREAM_NOTIFICATION);
            }
        } else {
            Uri defaultUri = System.DEFAULT_NOTIFICATION_URI;
            notification.setSound(defaultUri, AudioManager.STREAM_NOTIFICATION);
        }
    }

    private void setNotificationVibrate(Notification.Builder notification, NotificationPreferences notificationPreferences) {
        boolean vibrate = notificationPreferences.getShouldVibrate();
        if (vibrate) {
            // Use the system default for vibration
            notification.setDefaults(Notification.DEFAULT_VIBRATE);
        }
    }

    private void setNotificationBlink(Notification.Builder notification, NotificationPreferences notificationPreferences) {
        boolean blink = notificationPreferences.getShouldBlink();
        if (blink) {
            notification.setLights(Color.CYAN, 500, 500);
        }
    }

    private void setNotificationDeleteIntent(Notification.Builder notification, int notificationId) {
        // Let's add a delete intent when the notification is dismissed
        Intent delIntent = new Intent(mContext, NotificationDismissService.class);
        delIntent.putExtra(NOTIFICATION_ID, notificationId);
        PendingIntent deleteIntent = NotificationIntentAdapter.createPendingNotificationIntent(mContext, delIntent, mNotificationProps);
        notification.setDeleteIntent(deleteIntent);
    }

    private void addNotificationReplyAction(Notification.Builder notification, int notificationId, Bundle bundle) {
        String postId = bundle.getString("post_id");
        if (postId == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.N) {
            return;
        }

        Intent replyIntent = new Intent(mContext, NotificationReplyBroadcastReceiver.class);
        replyIntent.setAction(KEY_TEXT_REPLY);
        replyIntent.putExtra(NOTIFICATION_ID, notificationId);
        replyIntent.putExtra("pushNotification", bundle);

        PendingIntent replyPendingIntent = PendingIntent.getBroadcast(
            mContext,
            notificationId,
            replyIntent,
            PendingIntent.FLAG_UPDATE_CURRENT);

        RemoteInput remoteInput = new RemoteInput.Builder(KEY_TEXT_REPLY)
            .setLabel("Reply")
            .build();

        int icon = R.drawable.ic_notif_action_reply;
        CharSequence title = "Reply";
        Notification.Action replyAction = new Notification.Action.Builder(icon, title, replyPendingIntent)
            .addRemoteInput(remoteInput)
            .setAllowGeneratedReplies(true)
            .build();

        notification
            .setShowWhen(true)
            .addAction(replyAction);
    }

    private void notifyReceivedToJS() {
        mJsIOHelper.sendEventToJS(NOTIFICATION_RECEIVED_EVENT_NAME, mNotificationProps.asBundle(), mAppLifecycleFacade.getRunningReactContext());
    }

    private void cancelNotification(Bundle data, int notificationId) {
        final String channelId = data.getString("channel_id");
        final String badge = data.getString("badge");

        CustomPushNotification.badgeCount = Integer.parseInt(badge);
        CustomPushNotification.clearNotification(mContext.getApplicationContext(), notificationId, channelId);
    }

    private String getSenderName(Bundle bundle) {
        String senderName = bundle.getString("sender_name");
        if (senderName != null) {
            return senderName;
        }

        String channelName = bundle.getString("channel_name");
        if (channelName != null && channelName.startsWith("@")) {
            return channelName;
        }

        String message = bundle.getString("message");
        if (message != null) {
            String name = message.split(":")[0];
            if (name != message) {
                return name;
            }
        }

        return getConversationTitle(bundle);
    }

    private String removeSenderNameFromMessage(String message, String senderName) {
        return message.replaceFirst(senderName, "").replaceFirst(": ", "").trim();
    }

    private void notificationReceiptDelivery(String ackId, String postId, String type, boolean isIdLoaded, ResolvePromise promise) {
        ReceiptDelivery.send(context, ackId, postId, type, isIdLoaded, promise);
    }

    private void createNotificationChannels() {
        // Notification channels are not supported in Android Nougat and below
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        final NotificationManager notificationManager = (NotificationManager) mContext.getSystemService(Context.NOTIFICATION_SERVICE);

        mHighImportanceChannel = new NotificationChannel("channel_01", "High Importance", NotificationManager.IMPORTANCE_HIGH);
        mHighImportanceChannel.setShowBadge(true);
        notificationManager.createNotificationChannel(mHighImportanceChannel);

        mMinImportanceChannel = new NotificationChannel("channel_02", "Min Importance", NotificationManager.IMPORTANCE_MIN);
        mMinImportanceChannel.setShowBadge(true);
        notificationManager.createNotificationChannel(mMinImportanceChannel);
    }
}
