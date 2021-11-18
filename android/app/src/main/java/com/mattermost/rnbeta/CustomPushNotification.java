package com.mattermost.rnbeta;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import java.util.Collections;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

import com.wix.reactnativenotifications.core.notification.PushNotification;
import com.wix.reactnativenotifications.core.AppLaunchHelper;
import com.wix.reactnativenotifications.core.AppLifecycleFacade;
import com.wix.reactnativenotifications.core.JsIOHelper;
import static com.wix.reactnativenotifications.Defs.NOTIFICATION_RECEIVED_EVENT_NAME;

import com.mattermost.react_native_interface.ResolvePromise;

import org.json.JSONObject;

public class CustomPushNotification extends PushNotification {
    private static final String PUSH_NOTIFICATIONS = "PUSH_NOTIFICATIONS";
    private static final String VERSION_PREFERENCE = "VERSION_PREFERENCE";
    private static final String PUSH_TYPE_MESSAGE = "message";
    private static final String PUSH_TYPE_CLEAR = "clear";
    private static final String PUSH_TYPE_SESSION = "session";
    private static final String NOTIFICATIONS_IN_CHANNEL = "notificationsInChannel";

    public CustomPushNotification(Context context, Bundle bundle, AppLifecycleFacade appLifecycleFacade, AppLaunchHelper appLaunchHelper, JsIOHelper jsIoHelper) {
        super(context, bundle, appLifecycleFacade, appLaunchHelper, jsIoHelper);
        CustomPushNotificationHelper.createNotificationChannels(context);

        try {
            PackageInfo pInfo = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
            String version = String.valueOf(pInfo.versionCode);
            String storedVersion = null;
            SharedPreferences pSharedPref = context.getSharedPreferences(VERSION_PREFERENCE, Context.MODE_PRIVATE);
            if (pSharedPref != null) {
                storedVersion = pSharedPref.getString("Version", "");
            }

            if (!version.equals(storedVersion)) {
                if (pSharedPref != null) {
                    SharedPreferences.Editor editor = pSharedPref.edit();
                    editor.putString("Version", version);
                    editor.apply();
                }

                Map<String, Map<String, JSONObject>> inputMap = new HashMap<>();
                saveNotificationsMap(context, inputMap);
            }
        } catch (PackageManager.NameNotFoundException e) {
            e.printStackTrace();
        }
    }

    public static void cancelNotification(Context context, String channelId, String rootId, Integer notificationId, Boolean isCRTEnabled) {
        if (!android.text.TextUtils.isEmpty(channelId)) {
            final String notificationIdStr = notificationId.toString();
            final Boolean isThreadNotification = isCRTEnabled && !android.text.TextUtils.isEmpty(rootId);
            final String groupId = isThreadNotification ? rootId : channelId;
            Map<String, Map<String, JSONObject>> notificationsInChannel = loadNotificationsMap(context);
            Map<String, JSONObject> notifications = notificationsInChannel.get(groupId);
            if (notifications == null) {
                return;
            }
            final NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
            notificationManager.cancel(notificationId);
            notifications.remove(notificationIdStr);
            final StatusBarNotification[] statusNotifications = notificationManager.getActiveNotifications();
            boolean hasMore = false;
            for (final StatusBarNotification status : statusNotifications) {
                Bundle bundle = status.getNotification().extras;
                if (isThreadNotification) {
                    hasMore = bundle.getString("root_id").equals(rootId);
                } else if (isCRTEnabled) {
                    hasMore = !bundle.getString("root_id").equals(rootId);
                } else {
                    hasMore = bundle.getString("channel_id").equals(channelId);
                }
                if (hasMore) {
                    break;
                }
            }

            if (!hasMore) {
                notificationsInChannel.remove(groupId);
            } else {
                notificationsInChannel.put(groupId, notifications);
            }
            saveNotificationsMap(context, notificationsInChannel);
        }
    }

    public static void clearChannelNotifications(Context context, String channelId, String rootId, Boolean isCRTEnabled) {
        if (!android.text.TextUtils.isEmpty(channelId)) {
            final NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);

            // rootId is available only when CRT is enabled & clearing the thread
            final boolean isClearThread = isCRTEnabled && !android.text.TextUtils.isEmpty(rootId);
            
            Map<String, Map<String, JSONObject>> notificationsInChannel = loadNotificationsMap(context);
            String groupId = isClearThread ? rootId : channelId;
            Map<String, JSONObject> notifications = notificationsInChannel.get(groupId);

            if (notifications == null) {
                return;
            }

            notificationsInChannel.remove(groupId);
            saveNotificationsMap(context, notificationsInChannel);
            notifications.forEach(
                    (notificationIdStr, post) -> notificationManager.cancel(Integer.valueOf(notificationIdStr))
            );
        }
    }

    public static void clearAllNotifications(Context context) {
        if (context != null) {
            Map<String, Map<String, JSONObject>> notificationsInChannel = loadNotificationsMap(context);
            notificationsInChannel.clear();
            saveNotificationsMap(context, notificationsInChannel);
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
        final String rootId = initialData.getString("root_id");
        final boolean isCRTEnabled = initialData.getString("is_crt_enabled") != null && initialData.getString("is_crt_enabled").equals("true");
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

        switch (type) {
            case PUSH_TYPE_MESSAGE:
            case PUSH_TYPE_SESSION:
                if (!mAppLifecycleFacade.isAppVisible()) {
                    boolean createSummary = type.equals(PUSH_TYPE_MESSAGE);

                    if (type.equals(PUSH_TYPE_MESSAGE)) {
                        if (channelId != null) {
                            try {

                                JSONObject post = new JSONObject();
                                if (!android.text.TextUtils.isEmpty(rootId)) {
                                    post.put("root_id", rootId);
                                }
                                if (!android.text.TextUtils.isEmpty(postId)) {
                                    post.put("post_id", postId);
                                }

                                final Boolean isThreadNotification = isCRTEnabled && post.has("root_id");
                                final String groupId = isThreadNotification ? rootId : channelId;
                                
                                Map<String, Map<String, JSONObject>> notificationsInChannel = loadNotificationsMap(mContext);
                                Map<String, JSONObject> notifications = notificationsInChannel.get(groupId);
                                if (notifications == null) {
                                    notifications = Collections.synchronizedMap(new HashMap<String, JSONObject>());
                                }

                                if (notifications.size() > 0) {
                                    createSummary = false;
                                }
    
                                notifications.put(String.valueOf(notificationId),  post);
        
                                if (createSummary) {
                                    // Add the summary notification id as well
                                    notifications.put(String.valueOf(notificationId + 1), new JSONObject());
                                }
    
                                notificationsInChannel.put(groupId, notifications);
                                saveNotificationsMap(mContext, notificationsInChannel);
                            } catch(Exception e) {
                                e.printStackTrace();
                            }
                        }
                    }

                    buildNotification(notificationId, createSummary);
                }
                break;
            case PUSH_TYPE_CLEAR:
                clearChannelNotifications(mContext, channelId, rootId, isCRTEnabled);
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
        final String rootId = data.getString("root_id");
        final Boolean isCRTEnabled = data.getBoolean("is_crt_enabled");

        if (channelId != null) {
            clearChannelNotifications(mContext, channelId, rootId, isCRTEnabled);
        }
    }

    private void buildNotification(Integer notificationId, boolean createSummary) {
        final PendingIntent pendingIntent = super.getCTAPendingIntent();
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

    private void notificationReceiptDelivery(String ackId, String postId, String type, boolean isIdLoaded, ResolvePromise promise) {
        ReceiptDelivery.send(mContext, ackId, postId, type, isIdLoaded, promise);
    }

    private void notifyReceivedToJS() {
        mJsIOHelper.sendEventToJS(NOTIFICATION_RECEIVED_EVENT_NAME, mNotificationProps.asBundle(), mAppLifecycleFacade.getRunningReactContext());
    }

    private static void saveNotificationsMap(Context context, Map<String, Map<String, JSONObject>> inputMap) {
        SharedPreferences pSharedPref = context.getSharedPreferences(PUSH_NOTIFICATIONS, Context.MODE_PRIVATE);
        if (pSharedPref != null && context != null) {
            JSONObject json = new JSONObject(inputMap);
            String jsonString = json.toString();
            SharedPreferences.Editor editor = pSharedPref.edit();
            editor.remove(NOTIFICATIONS_IN_CHANNEL).commit();
            editor.putString(NOTIFICATIONS_IN_CHANNEL, jsonString);
            editor.commit();
        }
    }

    /**
     * Map Structure
     * 
     * {
     *     channel_id1 | thread_id1: {
     *         notification_id1: {
     *             post_id: 'p1',
     *             root_id: 'r1',
     *         }
     *     }
     * }
     *
     */
    private static Map<String, Map<String, JSONObject>> loadNotificationsMap(Context context) {
        Map<String, Map<String, JSONObject>> outputMap = new HashMap<>();
        if (context != null) {
            SharedPreferences pSharedPref = context.getSharedPreferences(PUSH_NOTIFICATIONS, Context.MODE_PRIVATE);
            try {
                if (pSharedPref != null) {
                    String jsonString = pSharedPref.getString(NOTIFICATIONS_IN_CHANNEL, (new JSONObject()).toString());
                    JSONObject json = new JSONObject(jsonString);

                    // Can be a channel_id or thread_id
                    Iterator<String> groupIdsItr = json.keys();
                    while (groupIdsItr.hasNext()) {
                        String groupId = groupIdsItr.next();
                        JSONObject notificationsJSONObj = json.getJSONObject(groupId);
                        Map<String, JSONObject> notifications = new HashMap<>();
                        Iterator<String> notificationIdKeys = notificationsJSONObj.keys();
                        while(notificationIdKeys.hasNext()) {
                            String notificationId = notificationIdKeys.next();
                            JSONObject post = notificationsJSONObj.getJSONObject(notificationId);
                            notifications.put(notificationId, post);
                        }
                        outputMap.put(groupId, notifications);
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        return outputMap;
    }
}
