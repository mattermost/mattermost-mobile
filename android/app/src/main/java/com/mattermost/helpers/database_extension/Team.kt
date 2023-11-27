package com.mattermost.helpers.database_extension

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.NoSuchKeyException
import com.facebook.react.bridge.ReadableMap
import com.mattermost.helpers.mapCursor
import com.nozbe.watermelondb.WMDatabase

fun findTeam(db: WMDatabase?, teamId: String): Boolean {
    if (db != null) {
        val team = find(db, "Team", teamId)
        return team != null
    }
    return false
}

fun findMyTeam(db: WMDatabase?, teamId: String): Boolean {
    if (db != null) {
        val team = find(db, "MyTeam", teamId)
        return team != null
    }
    return false
}

fun queryMyTeams(db: WMDatabase?): ArrayList<ReadableMap>? {
    db?.rawQuery("SELECT * FROM MyTeam")?.use { cursor ->
        val results = ArrayList<ReadableMap>()
        if (cursor.count > 0) {
            while(cursor.moveToNext()) {
                val map = Arguments.createMap()
                map.mapCursor(cursor)
                results.add(map)
            }
        }

        return results
    }
    return null
}

fun insertTeam(db: WMDatabase, team: ReadableMap): Boolean {
    val id = try { team.getString("id") } catch (e: Exception) { return false }
    val deleteAt = try {team.getDouble("delete_at") } catch (e: Exception) { 0 }
    if (deleteAt.toInt() > 0) {
        return false
    }

    val isAllowOpenInvite = try { team.getBoolean("allow_open_invite") } catch (e: NoSuchKeyException) { false }
    val description = try { team.getString("description") } catch (e: NoSuchKeyException) { "" }
    val displayName = try { team.getString("display_name") } catch (e: NoSuchKeyException) { "" }
    val name = try { team.getString("name") } catch (e: NoSuchKeyException) { "" }
    val updateAt = try { team.getDouble("update_at") } catch (e: NoSuchKeyException) { 0 }
    val type = try { team.getString("type") } catch (e: NoSuchKeyException) { "O" }
    val allowedDomains = try { team.getString("allowed_domains") } catch (e: NoSuchKeyException) { "" }
    val isGroupConstrained = try { team.getBoolean("group_constrained") } catch (e: NoSuchKeyException) { false }
    val lastTeamIconUpdatedAt = try { team.getDouble("last_team_icon_update") } catch (e: NoSuchKeyException) { 0 }
    val inviteId = try { team.getString("invite_id") } catch (e: NoSuchKeyException) { "" }
    val status = "created"

    return try {
        db.execute(
                """
                INSERT INTO Team (
                  id, allow_open_invite, description, display_name, name, update_at, type, allowed_domains,
                  group_constrained, last_team_icon_update, invite_id, _changed, _status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?)
                """.trimIndent(),
                arrayOf(
                        id, isAllowOpenInvite, description, displayName, name, updateAt,
                        type, allowedDomains, isGroupConstrained, lastTeamIconUpdatedAt, inviteId, status
                )
        )

        true
    } catch (e: Exception) {
        e.printStackTrace()
        false
    }
}

fun insertMyTeam(db: WMDatabase, myTeam: ReadableMap): Boolean {
    val currentUserId = queryCurrentUserId(db) ?: return false
    val id = try { myTeam.getString("id") } catch (e: NoSuchKeyException) { return false }
    val roles = try { myTeam.getString("roles") } catch (e: NoSuchKeyException) { "" }
    val schemeAdmin = try { myTeam.getBoolean("scheme_admin") } catch (e: NoSuchKeyException) { false }
    val status = "created"
    val membershipId = "$id-$currentUserId"

    return try {
        db.execute(
                "INSERT INTO MyTeam (id, roles, _changed, _status) VALUES (?, ?, '', ?)",
                arrayOf(id, roles, status)
        )
        db.execute(
                """
                    INSERT INTO TeamMembership (id, team_id, user_id, scheme_admin, _changed, _status)
                    VALUES (?, ?, ?, ?, '', ?)
                    """.trimIndent(),
                arrayOf(membershipId, id, currentUserId, schemeAdmin, status)
        )
        true
    } catch (e: Exception) {
        e.printStackTrace()
        false
    }
}
