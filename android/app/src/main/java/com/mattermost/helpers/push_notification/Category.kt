package com.mattermost.helpers.push_notification

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.mattermost.helpers.PushNotificationDataRunnable
import com.mattermost.helpers.database_extension.findByColumns
import com.mattermost.helpers.database_extension.queryCurrentUserId
import com.mattermost.helpers.database_extension.queryMyTeams
import com.nozbe.watermelondb.WMDatabase

suspend fun PushNotificationDataRunnable.Companion.fetchMyTeamCategories(db: WMDatabase, serverUrl: String, teamId: String): ReadableMap? {
    return try {
        val userId = queryCurrentUserId(db)
        val categories = fetch(serverUrl, "/api/v4/users/$userId/teams/$teamId/channels/categories")
        categories?.getMap("data")
    } catch (e: Exception) {
        e.printStackTrace()
        null
    }
}

fun PushNotificationDataRunnable.Companion.addToDefaultCategoryIfNeeded(db: WMDatabase, channel: ReadableMap): ReadableArray? {
    val channelId = channel.getString("id") ?: return null
    val channelType = channel.getString("type")
    val categoryChannels = Arguments.createArray()
    if (channelType == "D" || channelType == "G") {
        val myTeams = queryMyTeams(db)
        myTeams?.let {
            for (myTeam in it) {
                val map = categoryChannelForTeam(db, channelId, myTeam.getString("id"), "direct_messages")
                if (map != null) {
                    categoryChannels.pushMap(map)
                }
            }
        }
    } else {
        val map = categoryChannelForTeam(db, channelId, channel.getString("team_id"), "channels")
        if (map != null) {
            categoryChannels.pushMap(map)
        }
    }

    return categoryChannels
}

private fun categoryChannelForTeam(db: WMDatabase, channelId: String, teamId: String?, type: String): ReadableMap? {
    teamId?.let { id ->
        val category = findByColumns(db, "Category", arrayOf("type", "team_id"), arrayOf(type, id))
        val categoryId = category?.getString("id")
        categoryId?.let { cId ->
            val cc = findByColumns(
                    db,
                    "CategoryChannel",
                    arrayOf("category_id", "channel_id"),
                    arrayOf(cId, channelId)
            )
            if (cc == null) {
                val map = Arguments.createMap()
                map.putString("channel_id", channelId)
                map.putString("category_id", cId)
                map.putString("id", "${id}_$channelId")
                return map
            }
        }
    }

    return null
}

