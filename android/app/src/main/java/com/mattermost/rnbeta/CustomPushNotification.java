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

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

import com.facebook.react.bridge.ReadableArray;

import com.wix.reactnativenotifications.core.notification.PushNotification;
import com.wix.reactnativenotifications.core.AppLaunchHelper;
import com.wix.reactnativenotifications.core.AppLifecycleFacade;
import com.wix.reactnativenotifications.core.JsIOHelper;
import static com.wix.reactnativenotifications.Defs.NOTIFICATION_RECEIVED_EVENT_NAME;

import com.mattermost.react_native_interface.ResolvePromise;

import org.json.JSONArray;
import org.json.JSONException;
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

                Map<String, List<Integer>> inputMap = new HashMap<>();
                saveNotificationsMap(context, inputMap);
            }
        } catch (PackageManager.NameNotFoundException e) {
            e.printStackTrace();
        }
    }

    public static void cancelNotification(Context context, String channelId, Integer notificationId) {
        if (!android.text.TextUtils.isEmpty(channelId)) {
            String notificationIdStr = notificationId.toString();
            Map<String, Map<String, JSONObject>> notificationsInChannel = loadNotificationsMap(context);
            Map<String, JSONObject> notifications = notificationsInChannel.get(channelId);
            if (notifications == null) {
                return;
            }
            final NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
            notificationManager.cancel(notificationIdStr);
            notifications.remove(notificationIdStr);
            final StatusBarNotification[] statusNotifications = notificationManager.getActiveNotifications();
            boolean hasMore = false;
            for (final StatusBarNotification status : statusNotifications) {
                if (status.getNotification().extras.getString("channel_id").equals(channelId)) {
                    hasMore = true;
                    break;
                }
            }

            if (!hasMore) {
                notificationsInChannel.remove(channelId);
            }

            saveNotificationsMap(context, notificationsInChannel);
        }
    }

    public static void clearChannelNotifications(Context context, String channelId, String rootId, Boolean isCRTEnabled) {
        if (!android.text.TextUtils.isEmpty(channelId)) {
            Map<String, Map<String, JSONObject>> notificationsInChannel = loadNotificationsMap(context);
            Map<String, JSONObject> notifications = notificationsInChannel.get(channelId);
            if (notifications == null) {
                return;
            }

            final NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);

            final boolean isClearThread = android.text.TextUtils.isEmpty(rootId);

            if (isCRTEnabled || isClearThread) {
                Iterator<Map.Entry<String, JSONObject>> itr = notifications.entrySet().iterator();
                while (itr.hasNext()) {
                    Map.Entry<String, JSONObject> entry = itr.next();
                    String notificationIdStr = entry.getKey();
                    JSONObject post = entry.getValue();
                    try {
                        String postId = post.has("post_id") ? post.getString("post_id") : null;
                        String postRootId = post.has("root_id") ? post.getString("root_id") : null;
                        boolean notificationMatch;
                        if (isClearThread) {
                            notificationMatch = rootId.equals(postRootId) || rootId.equals(postId);
                        } else {
                            notificationMatch = android.text.TextUtils.isEmpty(postRootId);
                        }
                        if (notificationMatch) {
                            notificationManager.cancel(Integer.valueOf(notificationIdStr));
                            notifications.remove(notificationIdStr);
                            itr.remove();
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
                notificationsInChannel.put(channelId, notifications);
                saveNotificationsMap(context, notificationsInChannel);
            } else {
                notificationsInChannel.remove(channelId);
                saveNotificationsMap(context, notificationsInChannel);
                notifications.forEach(
                        (notificationIdStr, post) -> notificationManager.cancel(Integer.valueOf(notificationIdStr))
                );
            }
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
                            Map<String, Map<String, JSONObject>> notificationsInChannel = loadNotificationsMap(mContext);
                            Map<String, JSONObject> notifications = notificationsInChannel.get(channelId);
                            if (notifications == null) {
                                notifications = new HashMap<String, JSONObject>();
                            }
                            JSONObject post = new JSONObject();
                            try {
                                if (!android.text.TextUtils.isEmpty(rootId)) {
                                    post.put("root_id", rootId);
                                }
                                if (!android.text.TextUtils.isEmpty(postId)) {
                                    post.put("post_id", postId);
                                }
                            } catch(Exception e) {
                                e.printStackTrace();
                            }

                            notifications.put(String.valueOf(notificationId),  post);
                            if (notifications.size() > 1) {
                                createSummary = false;
                            }

                            if (createSummary) {
                                // Add the summary notification id as well
                                notifications.put(String.valueOf(notificationId + 1), new JSONObject());
                            }

                            notificationsInChannel.put(channelId, notifications);
                            saveNotificationsMap(mContext, notificationsInChannel);
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
        final String postId = data.getString("post_id");
        final String rootId = data.getString("root_id");
        final Boolean isCRTEnabled = data.getBoolean("is_crt_enabled");
        Integer notificationId = CustomPushNotificationHelper.MESSAGE_NOTIFICATION_ID;

        if (postId != null) {
            notificationId = postId.hashCode();
        }

        if (channelId != null) {
            Map<String, Map<String, JSONObject>> notificationsInChannel = loadNotificationsMap(mContext);
            Map<String, JSONObject> notifications = notificationsInChannel.get(channelId);
            notifications.remove(String.valueOf(notificationId));
            notificationsInChannel.put(channelId, notifications);
            saveNotificationsMap(mContext, notificationsInChannel);
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
     *     channel_id1: {
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
                    Iterator<String> channelIdsItr = json.keys();
                    while (channelIdsItr.hasNext()) {
                        String channelId = channelIdsItr.next();
                        JSONObject notificationsJSONObj = json.getJSONObject(channelId);
                        Map<String, JSONObject> notifications = new HashMap<>();
                        Iterator<String> notificationIdKeys = notificationsJSONObj.keys();
                        while(notificationIdKeys.hasNext()) {
                            String notificationId = notificationIdKeys.next();
                            JSONObject post = notificationsJSONObj.getJSONObject(notificationId);
                            notifications.put(notificationId, post);
                        }
                        outputMap.put(channelId, notifications);
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        return outputMap;
    }
}
