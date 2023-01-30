package com.mattermost.helpers;

import android.app.Notification;
import android.app.NotificationManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.os.Bundle;
import android.service.notification.StatusBarNotification;


import androidx.core.app.NotificationManagerCompat;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.Objects;

public class NotificationHelper {
    public static final String PUSH_NOTIFICATIONS = "PUSH_NOTIFICATIONS";
    public static final String NOTIFICATIONS_IN_GROUP = "notificationsInGroup";
    private static final String VERSION_PREFERENCE = "VERSION_PREFERENCE";

    public static void cleanNotificationPreferencesIfNeeded(Context context) {
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

                Map<String, JSONObject> inputMap = new HashMap<>();
                saveMap(context, inputMap);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static int getNotificationId(Bundle notification) {
        final String postId = notification.getString("post_id");
        final String channelId = notification.getString("channel_id");

        int notificationId = CustomPushNotificationHelper.MESSAGE_NOTIFICATION_ID;
        if (postId != null) {
            notificationId = postId.hashCode();
        } else if (channelId != null) {
            notificationId = channelId.hashCode();
        }

        return notificationId;
    }

    public static StatusBarNotification[] getDeliveredNotifications(Context context) {
        final NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        return notificationManager.getActiveNotifications();
    }

    public static boolean addNotificationToPreferences(Context context, int notificationId, Bundle notification) {
        try {
            boolean createSummary = true;
            final String serverUrl = notification.getString("server_url");
            final String channelId = notification.getString("channel_id");
            final String rootId = notification.getString("root_id");
            final boolean isCRTEnabled = notification.containsKey("is_crt_enabled") && notification.getString("is_crt_enabled").equals("true");

            final boolean isThreadNotification = isCRTEnabled && !android.text.TextUtils.isEmpty(rootId);
            final String groupId = isThreadNotification ? rootId : channelId;

            Map<String, JSONObject> notificationsPerServer = loadMap(context);
            JSONObject notificationsInServer = notificationsPerServer.get(serverUrl);
            if (notificationsInServer == null) {
                notificationsInServer = new JSONObject();
            }

            JSONObject notificationsInGroup = notificationsInServer.optJSONObject(groupId);
            if (notificationsInGroup == null) {
                notificationsInGroup = new JSONObject();
            }

            if (notificationsInGroup.length() > 0) {
                createSummary = false;
            }

            notificationsInGroup.put(String.valueOf(notificationId), false);

            if (createSummary) {
                // Add the summary notification id as well
                notificationsInGroup.put(String.valueOf(notificationId + 1), true);
            }
            notificationsInServer.put(groupId, notificationsInGroup);
            notificationsPerServer.put(serverUrl, notificationsInServer);
            saveMap(context, notificationsPerServer);

            return createSummary;
        } catch(Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    public static void dismissNotification(Context context, Bundle notification) {
        final boolean isCRTEnabled = notification.containsKey("is_crt_enabled") && notification.getString("is_crt_enabled").equals("true");
        final String serverUrl = notification.getString("server_url");
        final String channelId = notification.getString("channel_id");
        final String rootId = notification.getString("root_id");

        int notificationId = getNotificationId(notification);

        if (!android.text.TextUtils.isEmpty(serverUrl) && !android.text.TextUtils.isEmpty(channelId)) {
            boolean isThreadNotification = isCRTEnabled && !android.text.TextUtils.isEmpty(rootId);
            String notificationIdStr = String.valueOf(notificationId);
            String groupId = isThreadNotification ? rootId : channelId;

            Map<String, JSONObject> notificationsPerServer = loadMap(context);
            JSONObject notificationsInServer = notificationsPerServer.get(serverUrl);
            if (notificationsInServer == null) {
                return;
            }

            JSONObject notificationsInGroup = notificationsInServer.optJSONObject(groupId);
            if (notificationsInGroup == null) {
                return;
            }
            boolean isSummary = notificationsInGroup.optBoolean(notificationIdStr);
            notificationsInGroup.remove(notificationIdStr);

            NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
            notificationManager.cancel(notificationId);
            StatusBarNotification[] statusNotifications = getDeliveredNotifications(context);
            boolean hasMore = false;

            for (final StatusBarNotification status : statusNotifications) {
                Bundle bundle = status.getNotification().extras;
                if (isThreadNotification) {
                    hasMore = bundle.containsKey("root_id") && bundle.getString("root_id").equals(rootId);
                } else {
                    hasMore = bundle.containsKey("channel_id") && bundle.getString("channel_id").equals(channelId);
                }
                if (hasMore) break;
            }

            if (!hasMore || isSummary) {
                notificationsInServer.remove(groupId);
            } else {
                try {
                    notificationsInServer.put(groupId, notificationsInGroup);
                } catch (JSONException e) {
                    e.printStackTrace();
                }
            }

            notificationsPerServer.put(serverUrl, notificationsInServer);
            saveMap(context, notificationsPerServer);
        }
    }

    public static void removeChannelNotifications(Context context, String serverUrl, String channelId) {
        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
        Map<String, JSONObject> notificationsPerServer = loadMap(context);
        JSONObject notificationsInServer = notificationsPerServer.get(serverUrl);

        if (notificationsInServer != null) {
            notificationsInServer.remove(channelId);
            notificationsPerServer.put(serverUrl, notificationsInServer);
            saveMap(context, notificationsPerServer);
        }

        StatusBarNotification[] notifications = getDeliveredNotifications(context);
        for (StatusBarNotification sbn:notifications) {
            Notification n = sbn.getNotification();
            Bundle bundle = n.extras;
            String cId = bundle.getString("channel_id");
            String rootId = bundle.getString("root_id");
            boolean isCRTEnabled = bundle.containsKey("is_crt_enabled") && bundle.getString("is_crt_enabled").equals("true");
            boolean skipThreadNotification = isCRTEnabled && !android.text.TextUtils.isEmpty(rootId);
            if (Objects.equals(cId, channelId) && !skipThreadNotification) {
                notificationManager.cancel(sbn.getId());
            }
        }
    }

    public static void removeThreadNotifications(Context context, String serverUrl, String threadId) {
        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
        Map<String, JSONObject> notificationsPerServer = loadMap(context);
        JSONObject notificationsInServer = notificationsPerServer.get(serverUrl);

        StatusBarNotification[] notifications = getDeliveredNotifications(context);
        for (StatusBarNotification sbn:notifications) {
            Notification n = sbn.getNotification();
            Bundle bundle = n.extras;
            String rootId = bundle.getString("root_id");
            String postId = bundle.getString("post_id");
            if (Objects.equals(rootId, threadId)) {
                notificationManager.cancel(sbn.getId());
            }

            if (Objects.equals(postId, threadId)) {
                String channelId = bundle.getString("channel_id");
                int id = sbn.getId();
                if (notificationsInServer != null && channelId != null) {
                    JSONObject notificationsInChannel = notificationsInServer.optJSONObject(channelId);
                    if (notificationsInChannel != null) {
                        notificationsInChannel.remove(String.valueOf(id));
                        try {
                            notificationsInServer.put(channelId, notificationsInChannel);
                        } catch (JSONException e) {
                            e.printStackTrace();
                        }
                    }
                }
                notificationManager.cancel(id);
            }
        }

        if (notificationsInServer != null) {
            notificationsInServer.remove(threadId);
            notificationsPerServer.put(serverUrl, notificationsInServer);
            saveMap(context, notificationsPerServer);
        }
    }

    public static void removeServerNotifications(Context context, String serverUrl) {
        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
        Map<String, JSONObject> notificationsPerServer = loadMap(context);
        notificationsPerServer.remove(serverUrl);
        saveMap(context, notificationsPerServer);
        StatusBarNotification[] notifications = getDeliveredNotifications(context);
        for (StatusBarNotification sbn:notifications) {
            Notification n = sbn.getNotification();
            Bundle bundle = n.extras;
            String url = bundle.getString("server_url");
            if (Objects.equals(url, serverUrl)) {
                notificationManager.cancel(sbn.getId());
            }
        }
    }

    public static void clearChannelOrThreadNotifications(Context context, Bundle notification) {
        final String serverUrl = notification.getString("server_url");
        final String channelId = notification.getString("channel_id");
        final String rootId = notification.getString("root_id");
        if (channelId != null) {
            final boolean isCRTEnabled = notification.containsKey("is_crt_enabled") && notification.getString("is_crt_enabled").equals("true");
            // rootId is available only when CRT is enabled & clearing the thread
            final boolean isClearThread = isCRTEnabled && !android.text.TextUtils.isEmpty(rootId);

            if (isClearThread) {
                removeThreadNotifications(context, serverUrl, rootId);
            } else {
                removeChannelNotifications(context, serverUrl, channelId);
            }
        }
    }


    /**
     * Map Structure
     *
     * { serverUrl: { groupId: { notification1: true, notification2: false } } }
     * summary notification has a value of true
     *
     */

    private static void saveMap(Context context, Map<String, JSONObject> inputMap) {
        SharedPreferences pSharedPref = context.getSharedPreferences(PUSH_NOTIFICATIONS, Context.MODE_PRIVATE);
        if (pSharedPref != null) {
            JSONObject json = new JSONObject(inputMap);
            String jsonString = json.toString();
            SharedPreferences.Editor editor = pSharedPref.edit();
            editor.remove(NOTIFICATIONS_IN_GROUP).apply();
            editor.putString(NOTIFICATIONS_IN_GROUP, jsonString);
            editor.apply();
        }
    }

    private static Map<String, JSONObject> loadMap(Context context) {
        Map<String, JSONObject> outputMap = new HashMap<>();
        if (context != null) {
            SharedPreferences pSharedPref = context.getSharedPreferences(PUSH_NOTIFICATIONS, Context.MODE_PRIVATE);
            try {
                if (pSharedPref != null) {
                    String jsonString = pSharedPref.getString(NOTIFICATIONS_IN_GROUP, (new JSONObject()).toString());
                    JSONObject json = new JSONObject(jsonString);
                    Iterator<String> servers = json.keys();

                    while (servers.hasNext()) {
                        String serverUrl = servers.next();
                        JSONObject notificationGroup = json.getJSONObject(serverUrl);
                        outputMap.put(serverUrl, notificationGroup);
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        return outputMap;
    }
}
