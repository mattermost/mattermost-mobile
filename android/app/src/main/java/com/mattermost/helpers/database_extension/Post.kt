package com.mattermost.helpers.database_extension

import com.facebook.react.bridge.ReadableMap
import com.mattermost.helpers.DatabaseHelper
import com.mattermost.helpers.ReadableMapUtils
import com.nozbe.watermelondb.WMDatabase
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import kotlin.Exception

internal fun queryLastPostCreateAt(db: WMDatabase?, channelId: String): Double? {
    try {
        if (db != null) {
            val postsInChannelQuery = "SELECT earliest, latest FROM PostsInChannel WHERE channel_id=? ORDER BY latest DESC LIMIT 1"
            db.rawQuery(postsInChannelQuery, arrayOf(channelId)).use { cursor1 ->
                if (cursor1.count == 1) {
                    cursor1.moveToFirst()
                    val earliest = cursor1.getDouble(0)
                    val latest = cursor1.getDouble(1)
                    val postQuery = "SELECT create_at FROM POST WHERE channel_id= ? AND delete_at=0 AND create_at BETWEEN ? AND ? ORDER BY create_at DESC"

                    db.rawQuery(postQuery, arrayOf(channelId, earliest, latest)).use { cursor2 ->
                        if (cursor2.count >= 60) {
                            cursor2.moveToFirst()
                            return cursor2.getDouble(0)
                        }
                    }
                }
            }
        }
    } catch (e: Exception) {
        e.printStackTrace()
    }
    return null
}

fun queryPostSinceForChannel(db: WMDatabase?, channelId: String): Double? {
    try {
        if (db != null) {
            val postsInChannelQuery = "SELECT last_fetched_at FROM MyChannel WHERE id=? LIMIT 1"
            db.rawQuery(postsInChannelQuery, arrayOf(channelId)).use { cursor ->
                if (cursor.count == 1) {
                    cursor.moveToFirst()
                    val lastFetchedAt = cursor.getDouble(0)
                    if (lastFetchedAt == 0.0) {
                        return queryLastPostCreateAt(db, channelId)
                    }
                    return lastFetchedAt
                }
            }
        }
    } catch (e: Exception) {
        e.printStackTrace()
        // let it fall to return null
    }
    return null
}

fun queryLastPostInThread(db: WMDatabase?, rootId: String): Double? {
    try {
        if (db != null) {
            val query = "SELECT create_at FROM Post WHERE root_id=? AND delete_at=0 ORDER BY create_at DESC LIMIT 1"
            db.rawQuery(query, arrayOf(rootId)).use { cursor ->
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

internal fun insertPost(db: WMDatabase, post: JSONObject) {
    try {
        val id = try { post.getString("id") } catch (e: JSONException) { return }
        val channelId = try { post.getString("channel_id") } catch (e: JSONException) { return }
        val userId = try { post.getString("user_id") } catch (e: JSONException) { return }
        val createAt = try { post.getDouble("create_at") } catch (e: JSONException) { return }
        val deleteAt = try { post.getDouble("delete_at") } catch (e: JSONException) { 0 }
        val updateAt = try { post.getDouble("update_at") } catch (e: JSONException) { 0 }
        val editAt = try { post.getDouble("edit_at") } catch (e: JSONException) { 0 }
        val isPinned = try { post.getBoolean("is_pinned") } catch (e: JSONException) { false }
        val message = try { post.getString("message") } catch (e: JSONException) { "" }
        val messageSource = try { post.getString("message_source") } catch (e: JSONException) { "" }
        val metadata = try { post.getJSONObject("metadata") } catch (e: JSONException) { JSONObject() }
        val originalId = try { post.getString("original_id") } catch (e: JSONException) { "" }
        val pendingId = try { post.getString("pending_post_id") } catch (e: JSONException) { "" }
        val prevId = try { post.getString("prev_post_id") } catch (e: JSONException) { "" }
        val rootId = try { post.getString("root_id") } catch (e: JSONException) { "" }
        val type = try { post.getString("type") } catch (e: JSONException) { "" }
        val props = try { post.getJSONObject("props").toString() } catch (e: JSONException) { "" }
        val reactions = metadata.remove("reactions") as JSONArray?
        val customEmojis = metadata.remove("emojis") as JSONArray?
        val files = metadata.remove("files") as JSONArray?

        db.execute(
                """
                INSERT INTO Post 
                (id, channel_id, create_at, delete_at, update_at, edit_at, is_pinned, message, message_source, metadata, original_id, pending_post_id, 
                previous_post_id, root_id, type, user_id, props, _changed, _status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', 'created')
                """.trimIndent(),
                arrayOf(
                        id, channelId, createAt, deleteAt, updateAt, editAt,
                        isPinned, message, messageSource, metadata.toString(),
                        originalId, pendingId, prevId, rootId,
                        type, userId, props
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
    } catch (e: Exception) {
        e.printStackTrace()
    }
}

internal fun updatePost(db: WMDatabase, post: JSONObject) {
    try {
        val id = try { post.getString("id") } catch (e: JSONException) { return }
        val channelId = try { post.getString("channel_id") } catch (e: JSONException) { return }
        val userId = try { post.getString("user_id") } catch (e: JSONException) { return }
        val createAt = try { post.getDouble("create_at") } catch (e: JSONException) { return }
        val deleteAt = try { post.getDouble("delete_at") } catch (e: JSONException) { 0 }
        val updateAt = try { post.getDouble("update_at") } catch (e: JSONException) { 0 }
        val editAt = try { post.getDouble("edit_at") } catch (e: JSONException) { 0 }
        val isPinned = try { post.getBoolean("is_pinned") } catch (e: JSONException) { false }
        val message = try { post.getString("message") } catch (e: JSONException) { "" }
        val messageSource = try { post.getString("message_source") } catch (e: JSONException) { "" }
        val metadata = try { post.getJSONObject("metadata") } catch (e: JSONException) { JSONObject() }
        val originalId = try { post.getString("original_id") } catch (e: JSONException) { "" }
        val pendingId = try { post.getString("pending_post_id") } catch (e: JSONException) { "" }
        val prevId = try { post.getString("prev_post_id") } catch (e: JSONException) { "" }
        val rootId = try { post.getString("root_id") } catch (e: JSONException) { "" }
        val type = try { post.getString("type") } catch (e: JSONException) { "" }
        val props = try { post.getJSONObject("props").toString() } catch (e: JSONException) { "" }
        val reactions = metadata.remove("reactions") as JSONArray?
        val customEmojis = metadata.remove("emojis") as JSONArray?

        metadata.remove("files")

        db.execute(
                """
                UPDATE Post SET channel_id = ?, create_at = ?, delete_at = ?, update_at =?, edit_at =?, 
                is_pinned = ?, message = ?, message_source = ?, metadata = ?, original_id = ?, pending_post_id = ?, previous_post_id = ?, 
                root_id = ?, type = ?, user_id = ?, props = ?, _status = 'updated' 
                WHERE id = ?
                """.trimIndent(),
                arrayOf(
                        channelId, createAt, deleteAt, updateAt, editAt,
                        isPinned, message, messageSource, metadata.toString(),
                        originalId, pendingId, prevId, rootId,
                        type, userId, props,
                        id,
                )
        )

        if (reactions != null && reactions.length() > 0) {
            db.execute("DELETE FROM Reaction WHERE post_id = ?", arrayOf(post.getString("id")))
            insertReactions(db, reactions)
        }

        if (customEmojis != null && customEmojis.length() > 0) {
            insertCustomEmojis(db, customEmojis)
        }
    } catch (e: Exception) {
        e.printStackTrace()
    }
}

fun DatabaseHelper.handlePosts(db: WMDatabase, postsData: ReadableMap?, channelId: String, receivingThreads: Boolean) {
    // Posts, PostInChannel, PostInThread, Reactions, Files, CustomEmojis, Users
    try {
        if (postsData != null) {
            val ordered = postsData.getArray("order")?.toArrayList()
            val posts = ReadableMapUtils.toJSONObject(postsData.getMap("posts")).toMap()
            val previousPostId = postsData.getString("prev_post_id")
            val postsInThread = hashMapOf<String, List<JSONObject>>()
            val postList = posts.toList()
            var earliest = 0.0
            var latest = 0.0

            if (ordered != null && posts.isNotEmpty()) {
                val firstId = ordered.first()
                val lastId = ordered.last()
                var prevPostId = ""

                val sortedPosts = postList.sortedBy { (_, value) ->
                    ((value as Map<*, *>)["create_at"] as Double)
                }

                sortedPosts.forEachIndexed { index, it ->
                    val key = it.first
                    if (it.second != null) {
                        @Suppress("UNCHECKED_CAST", "UNCHECKED_CAST")
                        val post: MutableMap<String, Any?> = it.second as MutableMap<String, Any?>

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
                        val postId = post["id"] as? String ?: ""
                        val rootId = post["root_id"] as? String ?: ""
                        val postInThread = rootId.ifEmpty { postId }
                        var thread = postsInThread[postInThread]?.toMutableList()
                        if (thread == null) {
                            thread = mutableListOf()
                        }

                        thread.add(jsonPost)
                        postsInThread[postInThread] = thread.toList()

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
            }
            handlePostsInThread(db, postsInThread)
        }
    } catch (e: Exception) {
        e.printStackTrace()
    }
}
