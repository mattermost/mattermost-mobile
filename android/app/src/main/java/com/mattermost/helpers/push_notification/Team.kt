package com.mattermost.helpers.push_notification

import com.facebook.react.bridge.ReadableMap
import com.mattermost.helpers.PushNotificationDataRunnable
import com.mattermost.helpers.database_extension.findMyTeam
import com.mattermost.helpers.database_extension.findTeam
import com.nozbe.watermelondb.WMDatabase

suspend fun PushNotificationDataRunnable.Companion.fetchTeamIfNeeded(db: WMDatabase, serverUrl: String, teamId: String): Pair<ReadableMap?, ReadableMap?> {
    return try {
        var team: ReadableMap? = null
        var myTeam: ReadableMap? = null
        val teamExists = findTeam(db, teamId)
        val myTeamExists = findMyTeam(db, teamId)
        if (!teamExists) {
            team = fetch(serverUrl, "/api/v4/teams/$teamId")
        }

        if (!myTeamExists) {
            myTeam = fetch(serverUrl, "/api/v4/teams/$teamId/members/me")
        }

        Pair(team, myTeam)
    } catch (e: Exception) {
        e.printStackTrace()
        Pair(null, null)
    }
}
