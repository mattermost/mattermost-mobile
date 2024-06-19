package com.mattermost.rnutils.helpers

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext

class Notifications {
    companion object {
        private lateinit var context: ReactApplicationContext

        fun setCtx(reactContext: ReactApplicationContext) {
            context = reactContext
        }

        fun getDeliveredNotifications(promise: Promise?) {
            val applicationContext = context.applicationContext
            val notifications = NotificationHelper.getDeliveredNotifications(applicationContext)
            val result = Arguments.createArray()
            for (sbn in notifications) {
                val map = Arguments.createMap()
                val n = sbn.notification
                val bundle = n.extras
                val keys = bundle.keySet()
                for (key in keys) {
                    map.putString(key!!, bundle.getString(key))
                }
                result.pushMap(map)
            }
            promise?.resolve(result)
        }

        fun removeChannelNotifications(serverUrl: String, channelId: String) {
            val applicationContext = context.applicationContext
            NotificationHelper.removeChannelNotifications(applicationContext, serverUrl, channelId)
        }

        fun removeThreadNotifications(serverUrl: String, threadId: String) {
            val applicationContext = context.applicationContext
            NotificationHelper.removeThreadNotifications(applicationContext, serverUrl, threadId)
        }

        fun removeServerNotifications(serverUrl: String) {
            val applicationContext = context.applicationContext
            NotificationHelper.removeServerNotifications(applicationContext, serverUrl)
        }
    }
}
