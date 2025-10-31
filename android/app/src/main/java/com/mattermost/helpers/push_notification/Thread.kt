package com.mattermost.helpers.push_notification

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableMap
import com.mattermost.helpers.HeadersHelper
import com.mattermost.helpers.PushNotificationDataRunnable
import com.mattermost.helpers.database_extension.*
import com.nozbe.watermelondb.WMDatabase

internal suspend fun PushNotificationDataRunnable.Companion.fetchThread(db: WMDatabase, serverUrl: String, threadId: String, teamId: String?): ReadableMap? {
    val currentUserId = queryCurrentUserId(db) ?: return null
    val threadTeamId = (if (teamId.isNullOrEmpty()) queryCurrentTeamId(db) else teamId) ?: return null

    val options = Arguments.createMap()
    options.putMap("headers", HeadersHelper.getHeadersWithCredentials(serverUrl, false))

    return try {
        val thread = fetch(serverUrl, "/api/v4/users/$currentUserId/teams/${threadTeamId}/threads/$threadId", options)
        thread?.getMap("data")
    } catch (e: Exception) {
        e.printStackTrace()
        null
    }
}
