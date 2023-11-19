package com.mattermost.helpers.database_extension

import com.facebook.react.bridge.ReadableMap
import com.mattermost.helpers.DatabaseHelper
import com.mattermost.helpers.ReadableMapUtils
import com.nozbe.watermelondb.WMDatabase
import org.json.JSONException
import org.json.JSONObject

fun findChannel(db: WMDatabase?, channelId: String): Boolean {
    if (db != null) {
        val team = find(db, "Channel", channelId)
        return team != null
    }
    return false
}

fun findMyChannel(db: WMDatabase?, channelId: String): Boolean {
    if (db != null) {
        val team = find(db, "MyChannel", channelId)
        return team != null
    }
    return false
}

internal fun handleChannel(db: WMDatabase, channel: ReadableMap) {
    try {
        val exists = channel.getString("id")?.let { findChannel(db, it) } ?: false
        if (!exists) {
            val json = ReadableMapUtils.toJSONObject(channel)
            if (insertChannel(db, json)) {
                insertChannelInfo(db, json)
            }
        }
    } catch (e: Exception) {
        e.printStackTrace()
    }
}

internal fun DatabaseHelper.handleMyChannel(db: WMDatabase, myChannel: ReadableMap, postsData: ReadableMap?, receivingThreads: Boolean) {
    try {
        val json = ReadableMapUtils.toJSONObject(myChannel)
        val exists = myChannel.getString("id")?.let { findMyChannel(db, it) } ?: false

        if (postsData != null && !receivingThreads) {
            val posts = ReadableMapUtils.toJSONObject(postsData.getMap("posts")).toMap()
            val postList = posts.toList()
            val lastFetchedAt = postList.fold(0.0) { acc, next ->
                val post = next.second as Map<*, *>
                val createAt = post["create_at"] as Double
                val updateAt = post["update_at"] as Double
                val deleteAt = post["delete_at"] as Double
                val value = maxOf(createAt, updateAt, deleteAt)

                maxOf(value, acc)
            }
            json.put("last_fetched_at", lastFetchedAt)
        }

        if (exists) {
            updateMyChannel(db, json)
            return
        }

        if (insertMyChannel(db, json)) {
            insertMyChannelSettings(db, json)
            insertChannelMember(db, json)
        }
    } catch (e: Exception) {
        e.printStackTrace()
    }
}

fun insertChannel(db: WMDatabase, channel: JSONObject): Boolean {
    val id = try { channel.getString("id") } catch (e: JSONException) { return false }
    val createAt = try { channel.getDouble("create_at") } catch (e: JSONException) { 0 }
    val deleteAt = try { channel.getDouble("delete_at") } catch (e: JSONException) { 0 }
    val updateAt = try { channel.getDouble("update_at") } catch (e: JSONException) { 0 }
    val creatorId = try { channel.getString("creator_id") } catch (e: JSONException) { "" }
    val displayName = try { channel.getString("display_name") } catch (e: JSONException) { "" }
    val name = try { channel.getString("name") } catch (e: JSONException) { "" }
    val teamId = try { channel.getString("team_id") } catch (e: JSONException) { "" }
    val type = try { channel.getString("type") } catch (e: JSONException) { "O" }
    val isGroupConstrained = try { channel.getBoolean("group_constrained") } catch (e: JSONException) { false }
    val shared = try { channel.getBoolean("shared") } catch (e: JSONException) { false }

    return try {
        db.execute(
                """
                INSERT INTO Channel 
                (id, create_at, delete_at, update_at, creator_id, display_name, name, team_id, type, is_group_constrained, shared, _changed, _status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', 'created')
                """.trimIndent(),
                arrayOf(
                        id, createAt, deleteAt, updateAt,
                        creatorId, displayName, name, teamId, type,
                        isGroupConstrained, shared
                )
        )
        true
    } catch (e: Exception) {
        e.printStackTrace()
        false
    }
}

fun insertChannelInfo(db: WMDatabase, channel: JSONObject) {
    val id = try { channel.getString("id") } catch (e: JSONException) { return }
    val header = try { channel.getString("header") } catch (e: JSONException) { "" }
    val purpose = try { channel.getString("purpose") } catch (e: JSONException) { "" }

    try {
        db.execute(
                """
                INSERT INTO ChannelInfo
                (id, header, purpose, guest_count, member_count, pinned_post_count, _changed, _status)
                VALUES (?, ?, ?, 0, 0, 0, '', 'created')
                """.trimIndent(),
                arrayOf(id, header, purpose)
        )
    } catch (e: Exception) {
        e.printStackTrace()
    }
}

fun insertMyChannel(db: WMDatabase, myChanel: JSONObject): Boolean {
    return try {
        val id = try { myChanel.getString("id") } catch (e: JSONException) { return false }
        val roles = try { myChanel.getString("roles") } catch (e: JSONException) { "" }
        val msgCount = try { myChanel.getInt("message_count") } catch (e: JSONException) { 0 }
        val mentionsCount = try { myChanel.getInt("mentions_count") } catch (e: JSONException) { 0 }
        val isUnread = try { myChanel.getBoolean("is_unread") } catch (e: JSONException) { false }
        val lastPostAt = try { myChanel.getDouble("last_post_at") } catch (e: JSONException) { 0 }
        val lastViewedAt = try { myChanel.getDouble("last_viewed_at") } catch (e: JSONException) { 0 }
        val viewedAt = 0
        val lastFetchedAt = try { myChanel.getDouble("last_fetched_at") } catch (e: JSONException) { 0 }
        val manuallyUnread = false

        db.execute(
                """
                    INSERT INTO MyChannel
                    (id, roles, message_count, mentions_count, is_unread, manually_unread,
                    last_post_at, last_viewed_at, viewed_at, last_fetched_at, _changed, _status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', 'created') 
                    """,
                arrayOf(
                        id, roles, msgCount, mentionsCount, isUnread, manuallyUnread,
                        lastPostAt, lastViewedAt, viewedAt, lastFetchedAt
                )
        )

        true
    } catch (e: Exception) {
        e.printStackTrace()
        false
    }
}

fun insertMyChannelSettings(db: WMDatabase, myChanel: JSONObject) {
    try {
        val id = try { myChanel.getString("id") } catch (e: JSONException) { return }
        val notifyProps = try { myChanel.getString("notify_props") } catch (e: JSONException) { return }

        db.execute(
                """
                    INSERT INTO MyChannelSettings (id, notify_props, _changed, _status)
                    VALUES (?, ?, '', 'created')
                    """,
                arrayOf(id, notifyProps)
        )
    } catch (e: Exception) {
        e.printStackTrace()
    }
}

fun insertChannelMember(db: WMDatabase, myChanel: JSONObject) {
    try {
        val userId = queryCurrentUserId(db) ?: return
        val channelId = try { myChanel.getString("id") } catch (e: JSONException) { return }
        val schemeAdmin = try { myChanel.getBoolean("scheme_admin") } catch (e: JSONException) { false }
        val id = "$channelId-$userId"
        db.execute(
                """
                    INSERT INTO ChannelMembership 
                    (id, channel_id, user_id, scheme_admin, _changed, _status)
                    VALUES (?, ?, ?, ?, '', 'created')
                    """,
                arrayOf(id, channelId, userId, schemeAdmin)
        )

    } catch (e: Exception) {
        e.printStackTrace()
    }
}

fun updateMyChannel(db: WMDatabase, myChanel: JSONObject) {
    try {
        val id = try { myChanel.getString("id") } catch (e: JSONException) { return }
        val msgCount = try { myChanel.getInt("message_count") } catch (e: JSONException) { 0 }
        val mentionsCount = try { myChanel.getInt("mentions_count") } catch (e: JSONException) { 0 }
        val isUnread = try { myChanel.getBoolean("is_unread") } catch (e: JSONException) { false }
        val lastPostAt = try { myChanel.getDouble("last_post_at") } catch (e: JSONException) { 0 }
        val lastViewedAt = try { myChanel.getDouble("last_viewed_at") } catch (e: JSONException) { 0 }
        val lastFetchedAt = try { myChanel.getDouble("last_fetched_at") } catch (e: JSONException) { 0 }

        db.execute(
                """
                    UPDATE MyChannel SET message_count=?, mentions_count=?, is_unread=?, 
                    last_post_at=?, last_viewed_at=?, last_fetched_at=?, _status = 'updated' 
                    WHERE id=?
                    """,
                arrayOf(
                        msgCount, mentionsCount, isUnread,
                        lastPostAt, lastViewedAt, lastFetchedAt, id
                )
        )
    } catch (e: Exception) {
        e.printStackTrace()
    }
}
