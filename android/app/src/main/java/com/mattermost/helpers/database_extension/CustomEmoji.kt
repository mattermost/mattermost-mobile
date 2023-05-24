package com.mattermost.helpers.database_extension

import com.nozbe.watermelondb.Database
import org.json.JSONArray

internal fun insertCustomEmojis(db: Database, customEmojis: JSONArray) {
    for (i in 0 until customEmojis.length()) {
        try {
            val emoji = customEmojis.getJSONObject(i)
            if (find(db, "CustomEmoji", emoji.getString("id")) == null) {
                db.execute(
                        "INSERT INTO CustomEmoji (id, name, _changed, _status) VALUES (?, ?, '', 'created')",
                        arrayOf(
                                emoji.getString("id"),
                                emoji.getString("name"),
                        )
                )
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
