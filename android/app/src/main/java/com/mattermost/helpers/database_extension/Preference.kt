package com.mattermost.helpers.database_extension

import com.facebook.react.bridge.Arguments
import com.nozbe.watermelondb.Database
import com.nozbe.watermelondb.mapCursor

fun getTeammateDisplayNameSetting(db: Database): String {
    val configSetting = queryConfigDisplayNameSetting(db)
    if (configSetting != null) {
        return configSetting
    }

    try {
        db.rawQuery(
                "SELECT value FROM Preference where category = ? AND name = ? limit 1",
                arrayOf("display_settings", "name_format")
        ).use { cursor ->
            if (cursor.count <= 0) {
                return "username"
            }
            val resultMap = Arguments.createMap()
            cursor.moveToFirst()
            resultMap.mapCursor(cursor)
            return resultMap?.getString("value") ?: "username"
        }
    } catch (e: Exception) {
        return "username"
    }
}
