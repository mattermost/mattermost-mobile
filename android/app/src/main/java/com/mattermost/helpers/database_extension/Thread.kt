package com.mattermost.helpers.database_extension

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.NoSuchKeyException
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.mattermost.helpers.RandomId
import com.mattermost.helpers.mapCursor
import com.nozbe.watermelondb.WMDatabase
import org.json.JSONObject

private fun getLastReplyAt(thread: ReadableMap): Double {
    try {
        var v = thread.getDouble("last_reply_at")
        if (v == 0.0) {
            val post = thread.getMap("post")
            if (post != null) {
                v = post.getDouble("create_at")
            }
        }
        return v
    } catch (e: NoSuchKeyException) {
        return 0.0
    }
}

internal fun insertThread(db: WMDatabase, thread: ReadableMap) {
    // These fields are not present when we extract threads from posts
    try {
        val id = try { thread.getString("id") } catch (e: NoSuchKeyException) { return }
        val isFollowing = try { thread.getBoolean("is_following") } catch (e: NoSuchKeyException) { false }
        val lastViewedAt = try { thread.getDouble("last_viewed_at") } catch (e: NoSuchKeyException) { 0 }
        val unreadReplies = try { thread.getInt("unread_replies") } catch (e: NoSuchKeyException) { 0 }
        val unreadMentions = try { thread.getInt("unread_mentions") } catch (e: NoSuchKeyException) { 0 }
        val lastReplyAt = getLastReplyAt(thread)
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

internal fun updateThread(db: WMDatabase, thread: ReadableMap, existingRecord: ReadableMap) {
    try {
        // These fields are not present when we extract threads from posts
        val id = try { thread.getString("id") } catch (e: NoSuchKeyException) { return }
        val isFollowing = try { thread.getBoolean("is_following") } catch (e: NoSuchKeyException) { existingRecord.getInt("is_following") == 1 }
        val lastViewedAt = try { thread.getDouble("last_viewed_at") } catch (e: NoSuchKeyException) { existingRecord.getDouble("last_viewed_at") }
        val unreadReplies = try { thread.getInt("unread_replies") } catch (e: NoSuchKeyException) { existingRecord.getInt("unread_replies") }
        val unreadMentions = try { thread.getInt("unread_mentions") } catch (e: NoSuchKeyException) { existingRecord.getInt("unread_mentions") }
        val lastReplyAt = getLastReplyAt(thread)
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

internal fun insertThreadParticipants(db: WMDatabase, threadId: String, participants: ReadableArray) {
    for (i in 0 until participants.size()) {
        try {
            val participant = participants.getMap(i)
            val id = RandomId.generate()
            db.execute(
                    """
                    INSERT INTO ThreadParticipant 
                    (id, thread_id, user_id, _changed, _status) 
                    VALUES (?, ?, ?, '', 'created')
                    """.trimIndent(),
                    arrayOf(id, threadId, participant.getString("id"))
            )
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}

fun insertTeamThreadsSync(db: WMDatabase, teamId: String, earliest: Double, latest: Double) {
    try {
        val query = """
            INSERT INTO TeamThreadsSync (id, _changed, _status, earliest, latest)
            VALUES (?, '', 'created', ?, ?)
            """
        db.execute(query, arrayOf(teamId, earliest, latest))
    } catch (e: Exception) {
        e.printStackTrace()
    }
}

fun updateTeamThreadsSync(db: WMDatabase, teamId: String, earliest: Double, latest: Double, existingRecord: ReadableMap) {
    try {
        val storeEarliest = minOf(earliest, existingRecord.getDouble("earliest"))
        val storeLatest = maxOf(latest, existingRecord.getDouble("latest"))
        val query = "UPDATE TeamThreadsSync SET earliest=?, latest=? WHERE id=?"
        db.execute(query, arrayOf(storeEarliest, storeLatest, teamId))
    } catch (e: Exception) {
        e.printStackTrace()
    }
}

fun syncParticipants(db: WMDatabase, thread: ReadableMap) {
    try {
        val threadId = thread.getString("id")
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

internal fun handlePostsInThread(db: WMDatabase, postsInThread: Map<String, List<JSONObject>>) {
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
                    val storeEarliest = minOf(earliest, cursorMap.getDouble("earliest"))
                    val storeLatest = maxOf(latest, cursorMap.getDouble("latest"))
                    db.execute(
                            "UPDATE PostsInThread SET earliest = ?, latest = ?, _status = 'updated' WHERE root_id = ?",
                            arrayOf(
                                    storeEarliest,
                                    storeLatest,
                                    key
                            )
                    )
                    return
                }

                val id = RandomId.generate()
                db.execute(
                        """
                            INSERT INTO PostsInThread 
                            (id, root_id, earliest, latest, _changed, _status) 
                            VALUES (?, ?, ?, ?, '', 'created')
                            """.trimIndent(),
                        arrayOf(id, key, earliest, latest)
                )
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}

fun handleThreads(db: WMDatabase, threads: ArrayList<ReadableMap>, teamId: String?) {
    val teamIds = ArrayList<String>()
    if (teamId.isNullOrEmpty()) {
        val myTeams = queryMyTeams(db)
        if (myTeams != null) {
            for (myTeam in myTeams) {
                myTeam.getString("id")?.let { teamIds.add(it) }
            }
        }
    } else {
        teamIds.add(teamId)
    }

    for (i in 0 until threads.size) {
        try {
            val thread = threads[i]
            handleThread(db, thread, teamIds)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    handleTeamThreadsSync(db, threads, teamIds)
}

fun handleThread(db: WMDatabase, thread: ReadableMap, teamIds: ArrayList<String>) {
    // Insert/Update the thread
    val threadId = thread.getString("id")
    val isFollowing = thread.getBoolean("is_following")
    val existingRecord = find(db, "Thread", threadId)
    if (existingRecord == null) {
        insertThread(db, thread)
    } else {
        updateThread(db, thread, existingRecord)
    }

    syncParticipants(db, thread)

    // this is per team
    if (isFollowing) {
        for (teamId in teamIds) {
            handleThreadInTeam(db, thread, teamId)
        }
    }
}

fun handleThreadInTeam(db: WMDatabase, thread: ReadableMap, teamId: String) {
    val threadId = thread.getString("id") ?: return
    val existingRecord = findByColumns(
            db,
            "ThreadsInTeam",
            arrayOf("thread_id", "team_id"),
            arrayOf(threadId, teamId)
    )
    if (existingRecord == null) {
        try {
            val id = RandomId.generate()
            val query = """
            INSERT INTO ThreadsInTeam (id, team_id, thread_id, _changed, _status)
            VALUES (?, ?, ?, '', 'created')
            """
            db.execute(query, arrayOf(id, teamId, threadId))
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}

fun handleTeamThreadsSync(db: WMDatabase, threadList: ArrayList<ReadableMap>, teamIds: ArrayList<String>) {
    val sortedList = threadList.filter{ it.getBoolean("is_following") }
            .sortedBy {
                var v = getLastReplyAt(it)
                if (v == 0.0) {
                    Log.d("Database", "Trying to add a thread with no replies and no post")
                }
                v
            }
            .map {
                getLastReplyAt(it)
            }
    if (sortedList.isEmpty()) {
        return;
    }
    val earliest = sortedList.first()
    val latest = sortedList.last()

    for (teamId in teamIds) {
        val existingTeamThreadsSync = find(db, "TeamThreadsSync", teamId)
        if (existingTeamThreadsSync == null) {
            insertTeamThreadsSync(db, teamId, earliest, latest)
        } else {
            updateTeamThreadsSync(db, teamId, earliest, latest, existingTeamThreadsSync)
        }
    }
}
