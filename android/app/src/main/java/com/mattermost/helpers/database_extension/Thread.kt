package com.mattermost.helpers.database_extension

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.NoSuchKeyException
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.mattermost.helpers.RandomId
import com.nozbe.watermelondb.Database
import com.nozbe.watermelondb.mapCursor
import org.json.JSONObject

internal fun insertThread(db: Database, thread: ReadableMap) {
    // These fields are not present when we extract threads from posts
    try {
        val id = try { thread.getString("id") } catch (e: NoSuchKeyException) { return }
        val isFollowing = try { thread.getBoolean("is_following") } catch (e: NoSuchKeyException) { false }
        val lastViewedAt = try { thread.getDouble("last_viewed_at") } catch (e: NoSuchKeyException) { 0 }
        val unreadReplies = try { thread.getInt("unread_replies") } catch (e: NoSuchKeyException) { 0 }
        val unreadMentions = try { thread.getInt("unread_mentions") } catch (e: NoSuchKeyException) { 0 }
        val lastReplyAt = try { thread.getDouble("last_reply_at") } catch (e: NoSuchKeyException) { 0 }
        val replyCount = try { thread.getInt("reply_count") } catch (e: NoSuchKeyException) { 0 }

        db.execute(
                """
                INSERT INTO Thread 
                (id, last_reply_at, last_fetched_at, last_viewed_at, reply_count, is_following, unread_replies, unread_mentions, viewed_at, _changed, _status) 
                VALUES (?, ?, 0, ?, ?, ?, ?, ?, 0, '', 'created')
                """.trimIndent(),
                arrayOf(
                        id, lastReplyAt, lastViewedAt,
                        replyCount, isFollowing, unreadReplies, unreadMentions
                )
        )
    } catch (e: Exception) {
        e.printStackTrace()
    }
}

internal fun updateThread(db: Database, thread: ReadableMap, existingRecord: ReadableMap) {
    try {
        // These fields are not present when we extract threads from posts
        val id = try { thread.getString("id") } catch (e: NoSuchKeyException) { return }
        val isFollowing = try { thread.getBoolean("is_following") } catch (e: NoSuchKeyException) { existingRecord.getInt("is_following") == 1 }
        val lastViewedAt = try { thread.getDouble("last_viewed_at") } catch (e: NoSuchKeyException) { existingRecord.getDouble("last_viewed_at") }
        val unreadReplies = try { thread.getInt("unread_replies") } catch (e: NoSuchKeyException) { existingRecord.getInt("unread_replies") }
        val unreadMentions = try { thread.getInt("unread_mentions") } catch (e: NoSuchKeyException) { existingRecord.getInt("unread_mentions") }
        val lastReplyAt = try { thread.getDouble("last_reply_at") } catch (e: NoSuchKeyException) { 0 }
        val replyCount = try { thread.getInt("reply_count") } catch (e: NoSuchKeyException) { 0 }

        db.execute(
                """
                UPDATE Thread SET 
                last_reply_at = ?, last_viewed_at = ?, reply_count = ?, is_following = ?, unread_replies = ?, 
                unread_mentions = ?, _status = 'updated' where id = ?
                """.trimIndent(),
                arrayOf(
                        lastReplyAt, lastViewedAt, replyCount,
                        isFollowing, unreadReplies, unreadMentions, id
                )
        )
    } catch (e: Exception) {
        e.printStackTrace()
    }
}

internal fun insertThreadParticipants(db: Database, threadId: String, participants: ReadableArray) {
    for (i in 0 until participants.size()) {
        try {
            val participant = participants.getMap(i)
            val id = RandomId.generate()
            db.execute(
                    """
                    INSERT INTO ThreadParticipant 
                    (id, thread_id, user_id, _status) 
                    VALUES (?, ?, ?, 'created')
                    """.trimIndent(),
                    arrayOf(id, threadId, participant.getString("id"))
            )
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}

internal fun handlePostsInThread(db: Database, postsInThread: Map<String, List<JSONObject>>) {
    postsInThread.forEach { (key, list) ->
        try {
            val sorted = list.sortedBy { it.getDouble("create_at") }
            val earliest = sorted.first().getDouble("create_at")
            val latest = sorted.last().getDouble("create_at")
            db.rawQuery("SELECT * FROM PostsInThread WHERE root_id = ? ORDER BY latest DESC", arrayOf(key)).use { cursor ->
                if (cursor.count > 0) {
                    cursor.moveToFirst()
                    val cursorMap = Arguments.createMap()
                    cursorMap.mapCursor(cursor)
                    db.execute(
                            "UPDATE PostsInThread SET earliest = ?, latest = ?, _status = 'updated' WHERE id = ?",
                            arrayOf(
                                    minOf(earliest, cursorMap.getDouble("earliest")),
                                    maxOf(latest, cursorMap.getDouble("latest")),
                                    key
                            )
                    )
                    return
                }

                val id = RandomId.generate()
                db.execute(
                        """
                            INSERT INTO PostsInThread 
                            (id, root_id, earliest, latest, _status) 
                            VALUES (?, ?, ?, ?, 'created')
                            """.trimIndent(),
                        arrayOf(id, key, earliest, latest)
                )
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}

fun handleThreads(db: Database, threads: ReadableArray) {
    for (i in 0 until threads.size()) {
        try {
            val thread = threads.getMap(i)
            val threadId = thread.getString("id")

            // Insert/Update the thread
            val existingRecord = find(db, "Thread", threadId)
            if (existingRecord == null) {
                insertThread(db, thread)
            } else {
                updateThread(db, thread, existingRecord)
            }

            // Delete existing and insert thread participants
            val participants = thread.getArray("participants")
            if (participants != null) {
                db.execute("DELETE FROM ThreadParticipant WHERE thread_id = ?", arrayOf(threadId))

                if (participants.size() > 0) {
                    insertThreadParticipants(db, threadId!!, participants)
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
