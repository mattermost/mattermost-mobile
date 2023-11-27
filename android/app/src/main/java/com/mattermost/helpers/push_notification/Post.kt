package com.mattermost.helpers.push_notification

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.NoSuchKeyException
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableNativeArray
import com.mattermost.helpers.PushNotificationDataRunnable
import com.mattermost.helpers.ReadableArrayUtils
import com.mattermost.helpers.ReadableMapUtils
import com.mattermost.helpers.database_extension.*
import com.nozbe.watermelondb.WMDatabase

internal suspend fun PushNotificationDataRunnable.Companion.fetchPosts(
        db: WMDatabase, serverUrl: String, channelId: String, isCRTEnabled: Boolean,
        rootId: String?, loadedProfiles: ReadableArray?
): ReadableMap? {
    return try {
        val regex = Regex("""\B@(([a-z\d-._]*[a-z\d_])[.-]*)""", setOf(RegexOption.IGNORE_CASE))
        val currentUserId = queryCurrentUserId(db)
        val currentUser = find(db, "User", currentUserId)
        val currentUsername = currentUser?.getString("username")

        var additionalParams = ""
        if (isCRTEnabled) {
            additionalParams = "&collapsedThreads=true&collapsedThreadsExtended=true"
        }

        val receivingThreads = isCRTEnabled && !rootId.isNullOrEmpty()
        val endpoint = if (receivingThreads) {
            val since = rootId?.let { queryLastPostInThread(db, it) }
            val queryParams = if (since == null) "?perPage=60&fromCreatedAt=0&direction=up" else
                "?fromCreateAt=${since.toLong()}&direction=down"

            "/api/v4/posts/$rootId/thread$queryParams$additionalParams"
        } else {
            val since = queryPostSinceForChannel(db, channelId)
            val queryParams = if (since == null) "?page=0&per_page=60" else "?since=${since.toLong()}"
            "/api/v4/channels/$channelId/posts$queryParams$additionalParams"
        }

        val postsResponse = fetch(serverUrl, endpoint)
        val postData = postsResponse?.getMap("data")
        val results = Arguments.createMap()

        if (postData != null) {
            val data = ReadableMapUtils.toMap(postData)
            results.putMap("posts", postData)
            if (data != null) {
                val postsMap = data["posts"]
                if (postsMap != null) {
                    @Suppress("UNCHECKED_CAST")
                    val posts = ReadableMapUtils.toWritableMap(postsMap as? Map<String, Any>)
                    val iterator = posts.keySetIterator()
                    val userIds = mutableListOf<String>()
                    val usernames = mutableListOf<String>()

                    val threads = WritableNativeArray()
                    val threadParticipantUserIds = mutableListOf<String>() // Used to exclude the "userIds" present in the thread participants
                    val threadParticipantUsernames = mutableListOf<String>() // Used to exclude the "usernames" present in the thread participants
                    val threadParticipantUsers = HashMap<String, ReadableMap>() // All unique users from thread participants are stored here
                    val userIdsAlreadyLoaded = mutableListOf<String>()
                    if (loadedProfiles != null) {
                        for (i in 0 until loadedProfiles.size()) {
                            loadedProfiles.getMap(i).getString("id")?.let { userIdsAlreadyLoaded.add(it) }
                        }
                    }

                    fun findNeededUsernames(text: String?) {
                        if (text == null) {
                            return
                        }

                        val matchResults = regex.findAll(text)
                        matchResults.iterator().forEach {
                            val username = it.value.removePrefix("@")
                            if (!usernames.contains(username) && currentUsername != username && !specialMentions.contains(username)) {
                                usernames.add(username)
                            }
                        }
                    }

                    while (iterator.hasNextKey()) {
                        val key = iterator.nextKey()
                        val post = posts.getMap(key)
                        val userId = post?.getString("user_id")
                        if (userId != null && userId != currentUserId && !userIdsAlreadyLoaded.contains(userId) && !userIds.contains(userId)) {
                            userIds.add(userId)
                        }

                        val message = post?.getString("message")
                        findNeededUsernames(message)
                        val props = post?.getMap("props")
                        val attachments = props?.getArray("attachments")
                        if (attachments != null) {
                            for (i in 0 until attachments.size()) {
                                val attachment = attachments.getMap(i)
                                val pretext = attachment.getString("pretext")
                                val text = attachment.getString("text")
                                findNeededUsernames(pretext)
                                findNeededUsernames(text)
                            }
                        }


                        if (isCRTEnabled) {
                            // Add root post as a thread
                            val threadId = post?.getString("root_id")
                            if (threadId.isNullOrEmpty()) {
                                post?.let {
                                    val thread = Arguments.createMap()
                                    thread.putString("id", it.getString("id"))
                                    thread.putInt("reply_count", it.getInt("reply_count"))
                                    thread.putDouble("last_reply_at", 0.0)
                                    thread.putDouble("last_viewed_at", 0.0)
                                    thread.putArray("participants", it.getArray("participants"))
                                    thread.putMap("post", it)
                                    thread.putBoolean("is_following", try {
                                        it.getBoolean("is_following")
                                    } catch (e: NoSuchKeyException) {
                                        false
                                    })
                                    thread.putInt("unread_replies", 0)
                                    thread.putInt("unread_mentions", 0)
                                    thread.putDouble("delete_at", it.getDouble("delete_at"))
                                    threads.pushMap(thread)
                                }
                            }

                            // Add participant userIds and usernames to exclude them from getting fetched again
                            val participants = post?.getArray("participants")
                            participants?.let {
                                for (i in 0 until it.size()) {
                                    val participant = it.getMap(i)

                                    val participantId = participant.getString("id")
                                    if (participantId != currentUserId && participantId != null) {
                                        if (!threadParticipantUserIds.contains(participantId) && !userIdsAlreadyLoaded.contains(participantId)) {
                                            threadParticipantUserIds.add(participantId)
                                        }

                                        if (!threadParticipantUsers.containsKey(participantId)) {
                                            threadParticipantUsers[participantId] = participant
                                        }
                                    }

                                    val username = participant.getString("username")
                                    if (username != null && username != currentUsername && !threadParticipantUsernames.contains(username)) {
                                        threadParticipantUsernames.add(username)
                                    }
                                }
                            }
                        }
                    }

                    val existingUserIds = queryIds(db, "User", userIds.toTypedArray())
                    val existingUsernames = queryByColumn(db, "User", "username", usernames.toTypedArray())
                    userIds.removeAll { it in existingUserIds }
                    usernames.removeAll { it in existingUsernames }

                    if (threadParticipantUserIds.size > 0) {
                        // Do not fetch users found in thread participants as we get the user's data in the posts response already
                        userIds.removeAll { it in threadParticipantUserIds }
                        usernames.removeAll { it in threadParticipantUsernames }

                        // Get users from thread participants
                        val existingThreadParticipantUserIds = queryIds(db, "User", threadParticipantUserIds.toTypedArray())

                        // Exclude the thread participants already present in the DB from getting inserted again
                        val usersFromThreads = WritableNativeArray()
                        threadParticipantUsers.forEach { (userId, user) ->
                            if (!existingThreadParticipantUserIds.contains(userId)) {
                                usersFromThreads.pushMap(user)
                            }
                        }

                        if (usersFromThreads.size() > 0) {
                            results.putArray("usersFromThreads", usersFromThreads)
                        }
                    }

                    if (userIds.size > 0) {
                        results.putArray("userIdsToLoad", ReadableArrayUtils.toWritableArray(userIds.toTypedArray()))
                    }

                    if (usernames.size > 0) {
                        results.putArray("usernamesToLoad", ReadableArrayUtils.toWritableArray(usernames.toTypedArray()))
                    }

                    if (threads.size() > 0) {
                        results.putArray("threads", threads)
                    }
                }
            }
        }
        results
    } catch (e: Exception) {
        e.printStackTrace()
        null
    }
}
