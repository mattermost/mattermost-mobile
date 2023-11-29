package com.mattermost.helpers.database_extension

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.mattermost.helpers.RandomId
import com.mattermost.helpers.mapCursor
import com.nozbe.watermelondb.WMDatabase

internal fun findPostInChannel(chunks: ReadableArray, earliest: Double, latest: Double): ReadableMap? {
    for (i in 0 until chunks.size()) {
        val chunk = chunks.getMap(i)
        if (earliest >= chunk.getDouble("earliest") || latest <= chunk.getDouble("latest")) {
            return chunk
        }
    }

    return null
}

internal fun insertPostInChannel(db: WMDatabase, channelId: String, earliest: Double, latest: Double): ReadableMap? {
    return try {
        val id = RandomId.generate()
        db.execute(
                """
                INSERT INTO PostsInChannel 
                (id, channel_id, earliest, latest, _changed, _status) 
                VALUES (?, ?, ?, ?, '', 'created')
                """.trimIndent(),
                arrayOf(id, channelId, earliest, latest))

        val map = Arguments.createMap()
        map.putString("id", id)
        map.putString("channel_id", channelId)
        map.putDouble("earliest", earliest)
        map.putDouble("latest", latest)
        map
    } catch (e: Exception) {
        e.printStackTrace()
        null
    }
}

internal fun mergePostsInChannel(db: WMDatabase, existingChunks: ReadableArray, newChunk: ReadableMap) {
    for (i in 0 until existingChunks.size()) {
        try {
            val chunk = existingChunks.getMap(i)
            if (newChunk.getDouble("earliest") <= chunk.getDouble("earliest") &&
                    newChunk.getDouble("latest") >= chunk.getDouble("latest")) {
                db.execute("DELETE FROM PostsInChannel WHERE id = ?", arrayOf(chunk.getString("id")))
                break
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}

internal fun handlePostsInChannel(db: WMDatabase, channelId: String, earliest: Double, latest: Double) {
    try {
        db.rawQuery(
                "SELECT id, channel_id, earliest, latest FROM PostsInChannel WHERE channel_id = ?",
                arrayOf(channelId)
        ).use { cursor ->
            if (cursor.count == 0) {
                // create new post in channel
                insertPostInChannel(db, channelId, earliest, latest)
                return
            }

            val resultArray = Arguments.createArray()
            while (cursor.moveToNext()) {
                val cursorMap = Arguments.createMap()
                cursorMap.mapCursor(cursor)
                resultArray.pushMap(cursorMap)
            }

            val chunk = findPostInChannel(resultArray, earliest, latest)
            if (chunk != null) {
                db.execute(
                        "UPDATE PostsInChannel SET earliest = ?, latest = ?, _status = 'updated' WHERE id = ?",
                        arrayOf(
                                minOf(earliest, chunk.getDouble("earliest")),
                                maxOf(latest, chunk.getDouble("latest")),
                                chunk.getString("id")
                        )
                )
                return
            }

            val newChunk = insertPostInChannel(db, channelId, earliest, latest)
            newChunk?.let { mergePostsInChannel(db, resultArray, it) }
        }
    } catch (e: Exception) {
        e.printStackTrace()
    }
}
