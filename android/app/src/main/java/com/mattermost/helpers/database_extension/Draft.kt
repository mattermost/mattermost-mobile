package com.mattermost.helpers.database_extension

import com.mattermost.helpers.DatabaseHelper
import com.nozbe.watermelondb.WMDatabase
import org.json.JSONArray
import org.json.JSONException
import kotlin.Exception
import java.util.UUID

data class Draft(
    val id: String? = null,
    val channelId: String,
    val rootId: String,
    val message: String,
    val files: JSONArray = JSONArray(),
    val metadata: String = "{}",
    val updateAt: Double
)

internal fun insertDraft(db: WMDatabase, draft: Draft) {
    try {
        val id = draft.id ?: generateId()
        db.execute(
            """
            INSERT OR REPLACE INTO Draft 
            (id, channel_id, root_id, message, files, metadata, update_at, _status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 'created')
            """.trimIndent(),
            arrayOf(
                id,
                draft.channelId,
                draft.rootId,
                draft.message,
                draft.files.toString(),
                draft.metadata,
                draft.updateAt
            )
        )
    } catch (e: Exception) {
        e.printStackTrace()
    }
}

internal fun getDraft(db: WMDatabase, channelId: String, rootId: String = ""): Draft? {
    try {
        val query = """ 
            SELECT id, channel_id, root_id, message, files, metadata, update_at 
            FROM Draft 
            WHERE channel_id=? AND root_id=? 
            LIMIT 1
        """.trimIndent()
        db.rawQuery(query, arrayOf(channelId, rootId)).use { cursor ->
            if (cursor.count == 1) {
                cursor.moveToFirst()
                val id = cursor.getString(0)
                val chId = cursor.getString(1)
                val rId = cursor.getString(2)
                val message = cursor.getString(3)
                val filesStr = cursor.getString(4)
                val metadata = cursor.getString(5)
                val updateAt = cursor.getDouble(6)

                val filesJson = try {
                    JSONArray(filesStr)
                } catch (e: JSONException) {
                    JSONArray()
                }
                return Draft(id, chId, rId, message, filesJson, metadata, updateAt)
            }
        }
    } catch (e: Exception) {
        e.printStackTrace()
    }
    return null
}

fun generateId(): String {
    return UUID.randomUUID().toString().replace("-", "")
}

fun DatabaseHelper.insertOrUpdateDraft(
    db: WMDatabase,
    channelId: String,
    message: String,
    files: JSONArray
) {
    try {
        val existing = getDraft(db, channelId, "")
        val now = System.currentTimeMillis().toDouble()

        if (existing != null) {
            val updated = Draft(
                id = existing.id,
                channelId = channelId,
                rootId = existing.rootId,
                message = message,
                files = files,
                metadata = existing.metadata,
                updateAt = now
            )
            insertDraft(db, updated)
        } else {
            if (message.isEmpty() && files.length() == 0) return

            val newDraft = Draft(
                channelId = channelId,
                rootId = "",
                message = message,
                files = files,
                metadata = "{}",
                updateAt = now
            )
            insertDraft(db, newDraft)
        }
    } catch (e: Exception) {
        e.printStackTrace()
    }
}
