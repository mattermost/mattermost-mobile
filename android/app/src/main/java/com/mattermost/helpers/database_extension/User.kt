package com.mattermost.helpers.database_extension

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.NoSuchKeyException
import com.facebook.react.bridge.ReadableArray
import com.mattermost.helpers.ReadableMapUtils
import com.nozbe.watermelondb.WMDatabase

fun getLastPictureUpdate(db: WMDatabase?, userId: String): Double? {
    try {
        if (db != null) {
            var id = userId
            if (userId == "me") {
                (queryCurrentUserId(db) ?: userId).also { id = it }
            }
            val userQuery = "SELECT last_picture_update FROM User WHERE id=?"
            db.rawQuery(userQuery, arrayOf(id)).use { cursor ->
                if (cursor.count == 1) {
                    cursor.moveToFirst()
                    return cursor.getDouble(0)
                }
            }

        }
    } catch (e: Exception) {
        e.printStackTrace()
    }
    return null
}

fun getCurrentUserLocale(db: WMDatabase): String {
    try {
        val currentUserId = queryCurrentUserId(db) ?: return "en"
        val userQuery = "SELECT locale FROM User WHERE id=?"
        db.rawQuery(userQuery, arrayOf(currentUserId)).use { cursor ->
            if (cursor.count == 1) {
                cursor.moveToFirst()
                return cursor.getString(0)
            }
        }
    } catch (e: Exception) {
        e.printStackTrace()
    }

    return "en"
}

fun handleUsers(db: WMDatabase, users: ReadableArray) {
    for (i in 0 until users.size()) {
        val user = users.getMap(i)
        user?.let { u ->
            val roles = u.getString("roles") ?: ""
            val isBot = try {
                u.getBoolean("is_bot")
            } catch (e: NoSuchKeyException) {
                false
            }

            val lastPictureUpdate = try { u.getDouble("last_picture_update") } catch (e: NoSuchKeyException) { 0 }

            try {
                db.execute(
                        """
                        INSERT INTO User (id, auth_service, update_at, delete_at, email, first_name, is_bot, is_guest,
                        last_name, last_picture_update, locale, nickname, position, roles, status, username, notify_props, 
                        props, timezone, _changed, _status) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', 'created')
                        """.trimIndent(),
                        arrayOf(
                                u.getString("id"),
                                u.getString("auth_service"), u.getDouble("update_at"), u.getDouble("delete_at"),
                                u.getString("email"), u.getString("first_name"), isBot,
                                roles.contains("system_guest"), u.getString("last_name"), lastPictureUpdate,
                                u.getString("locale"), u.getString("nickname"), u.getString("position"),
                                roles, "", u.getString("username"), "{}",
                                ReadableMapUtils.toJSONObject(u.getMap("props")
                                        ?: Arguments.createMap()).toString(),
                                ReadableMapUtils.toJSONObject(u.getMap("timezone")
                                        ?: Arguments.createMap()).toString(),
                        )
                )
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}
