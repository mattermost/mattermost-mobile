package com.mattermost.helpers

import android.content.Context
import android.net.Uri
import android.text.TextUtils
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.NoSuchKeyException
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.nozbe.watermelondb.Database
import com.nozbe.watermelondb.mapCursor
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import java.lang.Exception
import java.util.*

class DatabaseHelper {
    private var defaultDatabase: Database? = null

    val onlyServerUrl: String?
        get() {
            val query = "SELECT url FROM Servers WHERE last_active_at != 0 AND identifier != ''"
            val cursor = defaultDatabase!!.rawQuery(query)
            if (cursor.count == 1) {
                cursor.moveToFirst()
                val url = cursor.getString(0)
                cursor.close()
                return url
            }
            return null
        }

    fun init(context: Context) {
        if (defaultDatabase == null) {
            setDefaultDatabase(context)
        }
    }

    fun getServerUrlForIdentifier(identifier: String): String? {
        val args: Array<Any?> = arrayOf(identifier)
        val query = "SELECT url FROM Servers WHERE identifier=?"
        val cursor = defaultDatabase!!.rawQuery(query, args)
        if (cursor.count == 1) {
            cursor.moveToFirst()
            val url = cursor.getString(0)
            cursor.close()
            return url
        }
        return null
    }

    fun find(db: Database, tableName: String, id: String?): ReadableMap? {
        val args: Array<Any?> = arrayOf(id)
        try {
            db.rawQuery("select * from $tableName where id == ? limit 1", args).use { cursor ->
                if (cursor.count <= 0) {
                    return null
                }
                val resultMap = Arguments.createMap()
                cursor.moveToFirst()
                resultMap.mapCursor(cursor)
                return resultMap
            }
        } catch (e: Exception) {
            return null
        }
    }

    fun getDatabaseForServer(context: Context?, serverUrl: String): Database? {
        val args: Array<Any?> = arrayOf(serverUrl)
        val query = "SELECT db_path FROM Servers WHERE url=?"
        val cursor = defaultDatabase!!.rawQuery(query, args)
        if (cursor.count == 1) {
            cursor.moveToFirst()
            val databasePath = cursor.getString(0)
            cursor.close()
            return Database(databasePath, context!!)
        }
        return null
    }

    fun queryIds(db: Database, tableName: String, ids: Array<String>): List<String> {
        val list: MutableList<String> = ArrayList()
        val args = TextUtils.join(",", Arrays.stream(ids).map { "?" }.toArray())
        try {
            db.rawQuery("select distinct id from $tableName where id IN ($args)", ids as Array<Any?>).use { cursor ->
                if (cursor.count > 0) {
                    while (cursor.moveToNext()) {
                        val index = cursor.getColumnIndex("id")
                        if (index >= 0) {
                            list.add(cursor.getString(index))
                        }
                    }
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return list
    }

    fun queryByColumn(db: Database, tableName: String, columnName: String, values: Array<Any?>): List<String> {
        val list: MutableList<String> = ArrayList()
        val args = TextUtils.join(",", Arrays.stream(values).map { "?" }.toArray())
        try {
            db.rawQuery("select distinct $columnName from $tableName where $columnName IN ($args)", values).use { cursor ->
                if (cursor.count > 0) {
                    while (cursor.moveToNext()) {
                        val index = cursor.getColumnIndex(columnName)
                        if (index >= 0) {
                            list.add(cursor.getString(index))
                        }
                    }
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return list
    }

    fun queryCurrentUserId(db: Database): String? {
        val result = find(db, "System", "currentUserId")!!
        return result.getString("value")
    }

    private fun queryLastPostCreateAt(db: Database?, channelId: String): Double? {
        if (db != null) {
            val postsInChannelQuery = "SELECT earliest, latest FROM PostsInChannel WHERE channel_id=? ORDER BY latest DESC LIMIT 1"
            val cursor1 = db.rawQuery(postsInChannelQuery, arrayOf(channelId))
            if (cursor1.count == 1) {
                cursor1.moveToFirst()
                val earliest = cursor1.getDouble(0)
                val latest = cursor1.getDouble(1)
                cursor1.close()
                val postQuery = "SELECT create_at FROM POST WHERE channel_id= ? AND delete_at=0 AND create_at BETWEEN ? AND ? ORDER BY create_at DESC"
                val cursor2 = db.rawQuery(postQuery, arrayOf(channelId, earliest, latest))
                if (cursor2.count >= 60) {
                    cursor2.moveToFirst()
                    val createAt = cursor2.getDouble(0)
                    cursor2.close()
                    return createAt
                }
            }
        }
        return null
    }

    fun queryPostSinceForChannel(db: Database?, channelId: String): Double? {
        if (db != null) {
            val postsInChannelQuery = "SELECT last_fetched_at FROM MyChannel WHERE id=? LIMIT 1"
            val cursor1 = db.rawQuery(postsInChannelQuery, arrayOf(channelId))
            if (cursor1.count == 1) {
                cursor1.moveToFirst()
                val lastFetchedAt = cursor1.getDouble(0)
                cursor1.close()
                if (lastFetchedAt == 0.0) {
                    return queryLastPostCreateAt(db, channelId)
                }
                return lastFetchedAt
            }
        }
        return null
    }

    fun handlePosts(db: Database, postsData: ReadableMap?, channelId: String, receivingThreads: Boolean) {
        // Posts, PostInChannel, PostInThread, Reactions, Files, CustomEmojis, Users
        if (postsData != null) {
            val ordered = postsData.getArray("order")?.toArrayList()
            val posts = ReadableMapUtils.toJSONObject(postsData.getMap("posts")).toMap()
            val previousPostId = postsData.getString("prev_post_id")
            val postsInThread = hashMapOf<String, List<JSONObject>>()
            val postList = posts.toList()
            var earliest = 0.0
            var latest = 0.0
            var lastFetchedAt = 0.0

            if (ordered != null && posts.isNotEmpty()) {
                val firstId = ordered.first()
                val lastId = ordered.last()
                lastFetchedAt = postList.fold(0.0) { acc, next ->
                    val post = next.second as Map<*, *>
                    val createAt = post["create_at"] as Double
                    val updateAt = post["update_at"] as Double
                    val deleteAt = post["delete_at"] as Double
                    val value = maxOf(createAt, updateAt, deleteAt)

                    maxOf(value, acc)
                }
                var prevPostId = ""

                val sortedPosts = postList.sortedBy { (_, value) ->
                    ((value as Map<*, *>)["create_at"] as Double)
                }

                sortedPosts.forEachIndexed { index, it ->
                    val key = it.first
                    if (it.second != null) {
                        val post = it.second as MutableMap<String, Any?>

                        if (index == 0) {
                            post.putIfAbsent("prev_post_id", previousPostId)
                        } else if (prevPostId.isNotEmpty()) {
                            post.putIfAbsent("prev_post_id", prevPostId)
                        }

                        if (lastId == key) {
                            earliest = post["create_at"] as Double
                        }
                        if (firstId == key) {
                            latest = post["create_at"] as Double
                        }

                        val jsonPost = JSONObject(post)
                        val rootId = post["root_id"] as? String

                        if (!rootId.isNullOrEmpty()) {
                            var thread = postsInThread[rootId]?.toMutableList()
                            if (thread == null) {
                                thread = mutableListOf()
                            }

                            thread.add(jsonPost)
                            postsInThread[rootId] = thread.toList()
                        }

                        if (find(db, "Post", key) == null) {
                            insertPost(db, jsonPost)
                        } else {
                            updatePost(db, jsonPost)
                        }

                        if (ordered.contains(key)) {
                            prevPostId = key
                        }
                    }
                }
            }

            if (!receivingThreads) {
                handlePostsInChannel(db, channelId, earliest, latest)
                updateMyChannelLastFetchedAt(db, channelId, lastFetchedAt)
            }
            handlePostsInThread(db, postsInThread)
        }
    }

    fun handleThreads(db: Database, threads: ReadableArray) {
        for (i in 0 until threads.size()) {
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
                db.execute("delete from ThreadParticipant where thread_id = ?", arrayOf(threadId))

                if (participants.size() > 0) {
                    insertThreadParticipants(db, threadId!!, participants)
                }
            }
        }
    }

    fun handleUsers(db: Database, users: ReadableArray) {
        for (i in 0 until users.size()) {
            val user = users.getMap(i)
            val roles =  user.getString("roles") ?: ""
            val isBot = try {
                user.getBoolean("is_bot")
            } catch (e: NoSuchKeyException) {
                false
            }

            val lastPictureUpdate = try { user.getDouble("last_picture_update") } catch (e: NoSuchKeyException) { 0 }


            db.execute(
                    "insert into User (id, auth_service, update_at, delete_at, email, first_name, is_bot, is_guest, " +
                            "last_name, last_picture_update, locale, nickname, position, roles, status, username, notify_props, " +
                            "props, timezone, _status) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'created')",
                    arrayOf(
                            user.getString("id"),
                            user.getString("auth_service"),
                            user.getDouble("update_at"),
                            user.getDouble("delete_at"),
                            user.getString("email"),
                            user.getString("first_name"),
                            isBot,
                            roles.contains("system_guest"),
                            user.getString("last_name"),
                            lastPictureUpdate,
                            user.getString("locale"),
                            user.getString("nickname"),
                            user.getString("position"),
                            roles,
                            "",
                            user.getString("username"),
                            "{}",
                            ReadableMapUtils.toJSONObject(user.getMap("props") ?: Arguments.createMap()).toString(),
                            ReadableMapUtils.toJSONObject(user.getMap("timezone") ?: Arguments.createMap()).toString(),
                    )
            )
        }
    }

    private fun setDefaultDatabase(context: Context) {
        val databaseName = "app.db"
        val databasePath = Uri.fromFile(context.filesDir).toString() + "/" + databaseName
        defaultDatabase = Database(databasePath, context)
    }

    private fun insertPost(db: Database, post: JSONObject) {
        var metadata: JSONObject?
        var reactions: JSONArray? = null
        var customEmojis: JSONArray? = null
        var files: JSONArray? = null

        try {
            metadata = post.getJSONObject("metadata")
            reactions = metadata.remove("reactions") as JSONArray?
            customEmojis = metadata.remove("emojis") as JSONArray?
            files = metadata.remove("files") as JSONArray?
        } catch (e: Exception) {
            // no metadata found
            metadata = JSONObject()
        }

        db.execute(
                "insert into Post " +
                        "(id, channel_id, create_at, delete_at, update_at, edit_at, is_pinned, message, metadata, original_id, pending_post_id, " +
                        "previous_post_id, root_id, type, user_id, props, _status)" +
                        " values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'created')",
                arrayOf(
                        post.getString("id"),
                        post.getString("channel_id"),
                        post.getDouble("create_at"),
                        post.getDouble("delete_at"),
                        post.getDouble("update_at"),
                        post.getDouble("edit_at"),
                        post.getBoolean("is_pinned"),
                        post.getString("message"),
                        metadata.toString(),
                        post.getString("original_id"),
                        post.getString("pending_post_id"),
                        post.getString("prev_post_id"),
                        post.getString("root_id"),
                        post.getString("type"),
                        post.getString("user_id"),
                        post.getJSONObject("props").toString()
                )
        )

        if (reactions != null && reactions.length() > 0) {
            insertReactions(db, reactions)
        }

        if (customEmojis != null && customEmojis.length() > 0) {
            insertCustomEmojis(db, customEmojis)
        }

        if (files != null && files.length() > 0) {
            insertFiles(db, files)
        }
    }

    private fun updatePost(db: Database, post: JSONObject) {
        var metadata: JSONObject?
        var reactions: JSONArray? = null
        var customEmojis: JSONArray? = null

        try {
            metadata = post.getJSONObject("metadata")
            reactions = metadata.remove("reactions") as JSONArray?
            customEmojis = metadata.remove("emojis") as JSONArray?
            metadata.remove("files")
        } catch (e: Exception) {
            // no metadata found
            metadata = JSONObject()
        }

        db.execute(
                "update Post SET channel_id = ?, create_at = ?, delete_at = ?, update_at =?, edit_at =?, " +
                        "is_pinned = ?, message = ?, metadata = ?, original_id = ?, pending_post_id = ?, previous_post_id = ?, " +
                        "root_id = ?, type = ?, user_id = ?, props = ?, _status = 'updated' " +
                        "where id = ?",
                arrayOf(
                        post.getString("channel_id"),
                        post.getDouble("create_at"),
                        post.getDouble("delete_at"),
                        post.getDouble("update_at"),
                        post.getDouble("edit_at"),
                        post.getBoolean("is_pinned"),
                        post.getString("message"),
                        metadata.toString(),
                        post.getString("original_id"),
                        post.getString("pending_post_id"),
                        post.getString("prev_post_id"),
                        post.getString("root_id"),
                        post.getString("type"),
                        post.getString("user_id"),
                        post.getJSONObject("props").toString(),
                        post.getString("id"),
                )
        )

        if (reactions != null && reactions.length() > 0) {
            db.execute("delete from Reaction where post_id = ?", arrayOf(post.getString("id")))
            insertReactions(db, reactions)
        }

        if (customEmojis != null && customEmojis.length() > 0) {
            insertCustomEmojis(db, customEmojis)
        }
    }

    private fun insertThread(db: Database, thread: ReadableMap) {
        // These fields are not present when we extract threads from posts
        val isFollowing = try { thread.getBoolean("is_following") } catch (e: NoSuchKeyException) { false }
        val lastViewedAt = try { thread.getDouble("last_viewed_at") } catch (e: NoSuchKeyException) { 0 }
        val unreadReplies = try { thread.getInt("unread_replies") } catch (e: NoSuchKeyException) { 0 }
        val unreadMentions = try { thread.getInt("unread_mentions") } catch (e: NoSuchKeyException) { 0 }
        val lastReplyAt = try { thread.getDouble("last_reply_at") } catch (e: NoSuchKeyException) { 0 }
        val replyCount = try { thread.getInt("reply_count") } catch (e: NoSuchKeyException) { 0 }

        db.execute(
                "insert into Thread " +
                        "(id, last_reply_at, last_fetched_at, last_viewed_at, reply_count, is_following, unread_replies, unread_mentions, _status)" +
                        " values (?, ?, 0, ?, ?, ?, ?, ?, 'created')",
                arrayOf(
                        thread.getString("id"),
                        lastReplyAt,
                        lastViewedAt,
                        replyCount,
                        isFollowing,
                        unreadReplies,
                        unreadMentions
                )
        )
    }

    private fun updateThread(db: Database, thread: ReadableMap, existingRecord: ReadableMap) {
        // These fields are not present when we extract threads from posts
        val isFollowing = try { thread.getBoolean("is_following") } catch (e: NoSuchKeyException) { existingRecord.getInt("is_following") == 1 }
        val lastViewedAt = try { thread.getDouble("last_viewed_at") } catch (e: NoSuchKeyException) { existingRecord.getDouble("last_viewed_at") }
        val unreadReplies = try { thread.getInt("unread_replies") } catch (e: NoSuchKeyException) { existingRecord.getInt("unread_replies") }
        val unreadMentions = try { thread.getInt("unread_mentions") } catch (e: NoSuchKeyException) { existingRecord.getInt("unread_mentions") }
        val lastReplyAt = try { thread.getDouble("last_reply_at") } catch (e: NoSuchKeyException) { 0 }
        val replyCount = try { thread.getInt("reply_count") } catch (e: NoSuchKeyException) { 0 }

        db.execute(
                "update Thread SET last_reply_at = ?, last_viewed_at = ?, reply_count = ?, is_following = ?, unread_replies = ?, unread_mentions = ?, _status = 'updated' where id = ?",
                arrayOf(
                        lastReplyAt,
                        lastViewedAt,
                        replyCount,
                        isFollowing,
                        unreadReplies,
                        unreadMentions,
                        thread.getString("id")
                )
        )
    }

    private fun insertThreadParticipants(db: Database, threadId: String, participants: ReadableArray) {
        for (i in 0 until participants.size()) {
            val participant = participants.getMap(i)
            val id = RandomId.generate()
            db.execute(
                    "insert into ThreadParticipant " +
                            "(id, thread_id, user_id, _status)" +
                            " values (?, ?, ?, 'created')",
                    arrayOf(
                            id,
                            threadId,
                            participant.getString("id")
                    )
            )
        }
    }

    private fun insertCustomEmojis(db: Database, customEmojis: JSONArray) {
        for (i in 0 until customEmojis.length()) {
            val emoji = customEmojis.getJSONObject(i)
            if(find(db, "CustomEmoji", emoji.getString("id")) == null) {
                db.execute(
                        "insert into CustomEmoji (id, name, _status) values (?, ?, 'created')",
                        arrayOf(
                                emoji.getString("id"),
                                emoji.getString("name"),
                        )
                )
            }
        }
    }

    private fun insertFiles(db: Database, files: JSONArray) {
        for (i in 0 until files.length()) {
            val file = files.getJSONObject(i)
            val miniPreview = try { file.getString("mini_preview") } catch (e: JSONException) { "" }
            val height = try { file.getInt("height") } catch (e: JSONException) { 0 }
            val width = try { file.getInt("width") } catch (e: JSONException) { 0 }
            db.execute(
                    "insert into File (id, extension, height, image_thumbnail, local_path, mime_type, name, post_id, size, width, _status) " +
                            "values (?, ?, ?, ?, '', ?, ?, ?, ?, ?, 'created')",
                    arrayOf(
                            file.getString("id"),
                            file.getString("extension"),
                            height,
                            miniPreview,
                            file.getString("mime_type"),
                            file.getString("name"),
                            file.getString("post_id"),
                            file.getDouble("size"),
                            width
                    )
            )
        }
    }

    private fun insertReactions(db: Database, reactions: JSONArray) {
        for (i in 0 until reactions.length()) {
            val reaction = reactions.getJSONObject(i)
            val id = RandomId.generate()
            db.execute(
                    "insert into Reaction (id, create_at, emoji_name, post_id, user_id, _status) " +
                            "values (?, ?, ?, ?, ?, 'created')",
                    arrayOf(
                            id,
                            reaction.getDouble("create_at"),
                            reaction.getString("emoji_name"),
                            reaction.getString("post_id"),
                            reaction.getString("user_id")
                    )
            )
        }
    }

    private fun handlePostsInChannel(db: Database, channelId: String, earliest: Double, latest: Double) {
        db.rawQuery("select id, channel_id, earliest, latest from PostsInChannel where channel_id = ?", arrayOf(channelId)).use { cursor ->
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
                            "update PostsInChannel set earliest = ?, latest = ?, _status = 'updated' where id = ?",
                            arrayOf(
                                    minOf(earliest, chunk.getDouble("earliest")),
                                    maxOf(latest, chunk.getDouble("latest")),
                                    chunk.getString("id")
                            )
                    )
                    return
                }

            val newChunk = insertPostInChannel(db, channelId, earliest, latest)
            mergePostsInChannel(db, resultArray, newChunk)
        }
    }

    private fun updateMyChannelLastFetchedAt(db: Database, channelId: String, lastFetchedAt: Double) {
        db.execute(
                "UPDATE MyChannel SET last_fetched_at = ?, _status = 'updated' WHERE id = ?",
                arrayOf(
                        lastFetchedAt,
                        channelId
                )
        )
    }

    private fun findPostInChannel(chunks: ReadableArray, earliest: Double, latest: Double): ReadableMap? {
        for (i in 0 until chunks.size()) {
            val chunk = chunks.getMap(i)
            if (earliest >= chunk.getDouble("earliest") || latest <= chunk.getDouble("latest")) {
                return chunk
            }
        }

        return null
    }

    private fun insertPostInChannel(db: Database, channelId: String, earliest: Double, latest: Double): ReadableMap {
        val id = RandomId.generate()
        db.execute("insert into PostsInChannel (id, channel_id, earliest, latest, _status) values (?, ?, ?, ?, 'created')",
                arrayOf(id, channelId, earliest, latest))

        val map = Arguments.createMap()
        map.putString("id", id)
        map.putString("channel_id", channelId)
        map.putDouble("earliest", earliest)
        map.putDouble("latest", latest)
        return map
    }

    private fun mergePostsInChannel(db: Database, existingChunks: ReadableArray, newChunk: ReadableMap) {
        for (i in 0 until existingChunks.size()) {
            val chunk = existingChunks.getMap(i)
            if (newChunk.getDouble("earliest") <= chunk.getDouble("earliest") &&
                    newChunk.getDouble("latest") >= chunk.getDouble("latest")) {
                db.execute("delete from PostsInChannel where id = ?", arrayOf(chunk.getString("id")))
                break
            }
        }
    }

    private fun handlePostsInThread(db: Database, postsInThread: Map<String, List<JSONObject>>) {
        postsInThread.forEach { (key, list) ->
            val sorted = list.sortedBy { it.getDouble("create_at") }
            val earliest = sorted.first().getDouble("create_at")
            val latest = sorted.last().getDouble("create_at")
            db.rawQuery("select * from PostsInThread where root_id = ? order by latest desc", arrayOf(key)).use { cursor ->
                if (cursor.count > 0) {
                    cursor.moveToFirst()
                    val cursorMap = Arguments.createMap()
                    cursorMap.mapCursor(cursor)
                    db.execute(
                            "update PostsInThread set earliest = ?, latest = ?, _status = 'updated' where id = ?",
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
                        "insert into PostsInThread (id, root_id, earliest, latest, _status) " +
                                "values (?, ?, ?, ?, 'created')",
                        arrayOf(id, key, earliest, latest)
                )
            }
        }
    }

    private fun JSONObject.toMap(): Map<String, *> = keys().asSequence().associateWith { it ->
        when (val value = this[it])
        {
            is JSONArray ->
            {
                val map = (0 until value.length()).associate { Pair(it.toString(), value[it]) }
                JSONObject(map).toMap().values.toList()
            }
            is JSONObject -> value.toMap()
            JSONObject.NULL -> null
            else            -> value
        }
    }

    companion object {
        var instance: DatabaseHelper? = null
            get() {
                if (field == null) {
                    field = DatabaseHelper()
                }
                return field
            }
            private set
    }
}
