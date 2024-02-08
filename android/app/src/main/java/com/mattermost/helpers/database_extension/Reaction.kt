package com.mattermost.helpers.database_extension

import com.mattermost.helpers.RandomId
import com.nozbe.watermelondb.WMDatabase
import org.json.JSONArray

internal fun insertReactions(db: WMDatabase, reactions: JSONArray) {
    for (i in 0 until reactions.length()) {
        try {
            val reaction = reactions.getJSONObject(i)
            val id = RandomId.generate()
            db.execute(
                    """
                    INSERT INTO Reaction 
                    (id, create_at, emoji_name, post_id, user_id, _changed, _status) 
                    VALUES (?, ?, ?, ?, ?, '', 'created')
                    """.trimIndent(),
                    arrayOf(
                            id,
                            reaction.getDouble("create_at"), reaction.getString("emoji_name"),
                            reaction.getString("post_id"), reaction.getString("user_id")
                    )
            )
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
