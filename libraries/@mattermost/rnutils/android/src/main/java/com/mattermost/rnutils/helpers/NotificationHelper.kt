package com.mattermost.rnutils.helpers

import android.app.NotificationManager
import android.content.Context
import android.os.Bundle
import android.service.notification.StatusBarNotification
import android.text.TextUtils
import androidx.core.app.NotificationManagerCompat
import org.json.JSONException
import org.json.JSONObject
import androidx.core.content.edit

object NotificationHelper {
    private const val PUSH_NOTIFICATIONS: String = "PUSH_NOTIFICATIONS"
    private const val NOTIFICATIONS_IN_GROUP: String = "notificationsInGroup"
    private const val VERSION_PREFERENCE = "VERSION_PREFERENCE"
    const val MESSAGE_NOTIFICATION_ID: Int = 435345
    private const val KEY_ROOT_ID = "root_id"
    private const val KEY_CHANNEL_ID = "channel_id"
    private const val KEY_POST_ID = "post_id"
    private const val KEY_IS_CRT_ENABLED = "is_crt_enabled"
    private const val KEY_SERVER_URL = "server_url"

    private const val PREF_VERSION = "Version"

    fun cleanNotificationPreferencesIfNeeded(context: Context) {
        try {
            val pInfo = context.packageManager.getPackageInfo(context.packageName, 0)
            val version = pInfo.versionName
            var storedVersion: String? = null
            val pSharedPref = context.getSharedPreferences(VERSION_PREFERENCE, Context.MODE_PRIVATE)
            if (pSharedPref != null) {
                storedVersion = pSharedPref.getString(PREF_VERSION, "")
            }

            if (version != storedVersion) {
                pSharedPref?.edit {
                    putString(PREF_VERSION, version)
                }

                val inputMap: Map<String?, JSONObject?> = HashMap()
                saveMap(context, inputMap)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun getNotificationId(notification: Bundle): Int {
        val postId = getPostId(notification)
        val channelId = getChannelId(notification)

        var notificationId: Int = MESSAGE_NOTIFICATION_ID
        if (postId != null) {
            notificationId = postId.hashCode()
        } else if (channelId != null) {
            notificationId = channelId.hashCode()
        }

        return notificationId
    }

    fun getDeliveredNotifications(context: Context): Array<StatusBarNotification> {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        return notificationManager.activeNotifications
    }

    fun addNotificationToPreferences(context: Context, notificationId: Int, notification: Bundle): Boolean {
        try {
            var createSummary = true
            val serverUrl = getServerUrl(notification)
            val channelId = getChannelId(notification)
            val rootId = getRootId(notification)
            val isCRTEnabled = isCRTEnabled(notification)

            val isThreadNotification = isCRTEnabled && !TextUtils.isEmpty(rootId)
            val groupId = if (isThreadNotification) rootId else channelId

            val notificationsPerServer = loadMap(context)
            var notificationsInServer = notificationsPerServer[serverUrl]
            if (notificationsInServer == null) {
                notificationsInServer = JSONObject()
            }

            var notificationsInGroup = notificationsInServer.optJSONObject(groupId)
            if (notificationsInGroup == null) {
                notificationsInGroup = JSONObject()
            }

            if (notificationsInGroup.length() > 0) {
                createSummary = false
            }

            notificationsInGroup.put(notificationId.toString(), false)

            if (createSummary) {
                // Add the summary notification id as well
                notificationsInGroup.put((notificationId + 1).toString(), true)
            }
            groupId?.let { notificationsInServer.put(it, notificationsInGroup) }
            notificationsPerServer[serverUrl] = notificationsInServer
            saveMap(context, notificationsPerServer)

            return createSummary
        } catch (e: Exception) {
            e.printStackTrace()
            return false
        }
    }

    fun dismissNotification(context: Context, notification: Bundle) {
        val isCRTEnabled = isCRTEnabled(notification)
        val serverUrl = getServerUrl(notification)
        val channelId = getChannelId(notification)
        val rootId = getRootId(notification)

        val notificationId = getNotificationId(notification)

        if (!TextUtils.isEmpty(serverUrl) && !TextUtils.isEmpty(channelId)) {
            val isThreadNotification = isCRTEnabled && !TextUtils.isEmpty(rootId)
            val notificationIdStr = notificationId.toString()
            val groupId = if (isThreadNotification) rootId else channelId

            val notificationsPerServer = loadMap(context)
            val notificationsInServer = notificationsPerServer[serverUrl] ?: return

            val notificationsInGroup = notificationsInServer.optJSONObject(groupId) ?: return
            val isSummary = notificationsInGroup.optBoolean(notificationIdStr)
            notificationsInGroup.remove(notificationIdStr)

            val notificationManager = context.getSystemService(NotificationManager::class.java)
            notificationManager.cancel(notificationId)
            val statusNotifications = getDeliveredNotifications(context)
            var hasMore = false

            for (status in statusNotifications) {
                val bundle = status.notification.extras
                hasMore = if (isThreadNotification) {
                    bundle.containsKey(KEY_ROOT_ID) && getRootId(bundle) == rootId
                } else {
                    bundle.containsKey(KEY_CHANNEL_ID) && getChannelId(bundle) == channelId
                }
                if (hasMore) break
            }

            if (!hasMore || isSummary) {
                notificationsInServer.remove(groupId)
            } else {
                try {
                    groupId?.let { notificationsInServer.put(it, notificationsInGroup) }
                } catch (e: JSONException) {
                    e.printStackTrace()
                }
            }

            notificationsPerServer[serverUrl] = notificationsInServer
            saveMap(context, notificationsPerServer)
        }
    }

    fun removeChannelNotifications(context: Context, serverUrl: String?, channelId: String) {
        val notificationManager = NotificationManagerCompat.from(context)
        val notificationsPerServer = loadMap(context)
        val notificationsInServer = notificationsPerServer[serverUrl]

        if (notificationsInServer != null) {
            notificationsInServer.remove(channelId)
            notificationsPerServer[serverUrl] = notificationsInServer
            saveMap(context, notificationsPerServer)
        }

        val notifications = getDeliveredNotifications(context)
        for (sbn in notifications) {
            val n = sbn.notification
            val bundle = n.extras
            val cId = getChannelId(bundle)
            val rootId = getRootId(bundle)
            val isCRTEnabled = isCRTEnabled(bundle)
            val skipThreadNotification = isCRTEnabled && !TextUtils.isEmpty(rootId)
            if (cId == channelId && !skipThreadNotification) {
                notificationManager.cancel(sbn.id)
            }
        }
    }

    fun removeThreadNotifications(context: Context, serverUrl: String?, threadId: String?) {
        val notificationManager = NotificationManagerCompat.from(context)
        val notificationsPerServer = loadMap(context)
        val notificationsInServer = notificationsPerServer[serverUrl]

        val notifications = getDeliveredNotifications(context)
        for (sbn in notifications) {
            val n = sbn.notification
            val bundle = n.extras
            val rootId = getRootId(bundle)
            val postId = getPostId(bundle)
            if (rootId == threadId) {
                notificationManager.cancel(sbn.id)
            }

            if (postId == threadId) {
                val channelId = getChannelId(bundle)
                val id = sbn.id
                if (notificationsInServer != null && channelId != null) {
                    val notificationsInChannel = notificationsInServer.optJSONObject(channelId)
                    if (notificationsInChannel != null) {
                        notificationsInChannel.remove(id.toString())
                        try {
                            notificationsInServer.put(channelId, notificationsInChannel)
                        } catch (e: JSONException) {
                            e.printStackTrace()
                        }
                    }
                }
                notificationManager.cancel(id)
            }
        }

        if (notificationsInServer != null) {
            notificationsInServer.remove(threadId)
            notificationsPerServer[serverUrl] = notificationsInServer
            saveMap(context, notificationsPerServer)
        }
    }

    private fun getPostId(notification: Bundle) = notification.getString(KEY_POST_ID)

    fun removeServerNotifications(context: Context, serverUrl: String) {
        val notificationManager = NotificationManagerCompat.from(context)
        val notificationsPerServer = loadMap(context)
        notificationsPerServer.remove(serverUrl)
        saveMap(context, notificationsPerServer)
        val notifications = getDeliveredNotifications(context)
        for (sbn in notifications) {
            val n = sbn.notification
            val bundle = n.extras
            val url = getServerUrl(bundle)
            if (url == serverUrl) {
                notificationManager.cancel(sbn.id)
            }
        }
    }

    fun clearChannelOrThreadNotifications(context: Context, notification: Bundle) {
        val serverUrl = getServerUrl(notification)
        val channelId = getChannelId(notification)
        val rootId = getRootId(notification)
        if (channelId != null) {
            val isCRTEnabled = isCRTEnabled(notification)
            // rootId is available only when CRT is enabled & clearing the thread
            val isClearThread = isCRTEnabled && !TextUtils.isEmpty(rootId)

            if (isClearThread) {
                removeThreadNotifications(context, serverUrl, rootId)
            } else {
                removeChannelNotifications(context, serverUrl, channelId)
            }
        }
    }

    private fun getRootId(notification: Bundle) = notification.getString(KEY_ROOT_ID)

    private fun getChannelId(notification: Bundle) = notification.getString(KEY_CHANNEL_ID)

    private fun getServerUrl(notification: Bundle) = notification.getString(KEY_SERVER_URL)

    private fun isCRTEnabled(bundle: Bundle) =
        bundle.containsKey(KEY_IS_CRT_ENABLED) && bundle.getString(KEY_IS_CRT_ENABLED) == "true"


    /**
     * Map Structure
     *
     * { serverUrl: { groupId: { notification1: true, notification2: false } } }
     * summary notification has a value of true
     *
     */
    private fun saveMap(context: Context, inputMap: Map<String?, JSONObject?>) {
        val pSharedPref = context.getSharedPreferences(PUSH_NOTIFICATIONS, Context.MODE_PRIVATE)
        if (pSharedPref != null) {
            val json = JSONObject(inputMap)
            val jsonString = json.toString()
            val editor = pSharedPref.edit()
            editor.remove(NOTIFICATIONS_IN_GROUP).apply()
            editor.putString(NOTIFICATIONS_IN_GROUP, jsonString)
            editor.apply()
        }
    }

    private fun loadMap(context: Context?): MutableMap<String?, JSONObject?> {
        val outputMap: MutableMap<String?, JSONObject?> = HashMap()
        if (context != null) {
            val pSharedPref = context.getSharedPreferences(PUSH_NOTIFICATIONS, Context.MODE_PRIVATE)
            try {
                if (pSharedPref != null) {
                    val jsonString = pSharedPref.getString(NOTIFICATIONS_IN_GROUP, JSONObject().toString())
                    val json = jsonString?.let { JSONObject(it) }
                    val servers = json?.keys()

                    while (servers?.hasNext() == true) {
                        val serverUrl = servers.next()
                        val notificationGroup = json.getJSONObject(serverUrl)
                        outputMap[serverUrl] = notificationGroup
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        return outputMap
    }
}
