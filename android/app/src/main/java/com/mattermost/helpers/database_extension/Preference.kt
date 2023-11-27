package com.mattermost.helpers.database_extension

import com.facebook.react.bridge.Arguments
import com.mattermost.helpers.mapCursor
import com.nozbe.watermelondb.WMDatabase

fun getTeammateDisplayNameSetting(db: WMDatabase): String {
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
