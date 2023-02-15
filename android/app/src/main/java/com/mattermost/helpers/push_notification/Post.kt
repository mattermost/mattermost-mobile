package com.mattermost.helpers.push_notification

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableNativeArray
import com.mattermost.helpers.PushNotificationDataRunnable
import com.mattermost.helpers.ReadableArrayUtils
import com.mattermost.helpers.ReadableMapUtils
import com.mattermost.helpers.database_extension.*
import com.nozbe.watermelondb.Database

internal suspend fun PushNotificationDataRunnable.Companion.fetchPosts(db: Database, serverUrl: String, channelId: String, isCRTEnabled: Boolean, rootId: String?, loadedProfiles: ReadableArray?): ReadableMap? {
    val regex = Regex("""\B@(([a-z\d-._]*[a-z\d_])[.-]*)""", setOf(RegexOption.IGNORE_CASE))
    val since = queryPostSinceForChannel(db, channelId)
    val currentUserId = queryCurrentUserId(db)?.removeSurrounding("\"")
    val currentUser = find(db, "User", currentUserId)
    val currentUsername = currentUser?.getString("username")

    var additionalParams = ""
    if (isCRTEnabled) {
        additionalParams = "&collapsedThreads=true&collapsedThreadsExtended=true"
    }

    val receivingThreads = isCRTEnabled && !rootId.isNullOrEmpty()
    val endpoint = if (receivingThreads) {
        val queryParams = "?skipFetchThreads=false&perPage=60&fromCreatedAt=0&direction=up"
        "/api/v4/posts/$rootId/thread$queryParams$additionalParams"
    } else {
        val queryParams = if (since == null) "?page=0&per_page=60" else "?since=${since.toLong()}"
        "/api/v4/channels/$channelId/posts$queryParams$additionalParams"
    }

    val postsResponse = fetch(serverUrl, endpoint)
    val results = Arguments.createMap()

    if (postsResponse != null) {
        val data = ReadableMapUtils.toMap(postsResponse)
        results.putMap("posts", postsResponse)
        val postsData = data["data"] as? Map<*, *>
        if (postsData != null) {
            val postsMap = postsData["posts"]
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
                    for( i in 0 until loadedProfiles.size()) {
                        loadedProfiles.getMap(i).getString("id")?.let { userIdsAlreadyLoaded.add(it) }
                    }
                }

                while(iterator.hasNextKey()) {
                    val key = iterator.nextKey()
                    val post = posts.getMap(key)
                    val userId = post?.getString("user_id")
                    if (userId != null && userId != currentUserId && !userIdsAlreadyLoaded.contains(userId) && !userIds.contains(userId)) {
                        userIds.add(userId)
                    }
                    val message = post?.getString("message")
                    if (message != null) {
                        val matchResults = regex.findAll(message)
                        matchResults.iterator().forEach {
                            val username = it.value.removePrefix("@")
                            if (!usernames.contains(username) && currentUsername != username && !specialMentions.contains(username)) {
                                usernames.add(username)
                            }
                        }
                    }

                    if (isCRTEnabled) {
                        // Add root post as a thread
                        val threadId = post?.getString("root_id")
                        if (threadId.isNullOrEmpty()) {
                            threads.pushMap(post!!)
                        }

                        // Add participant userIds and usernames to exclude them from getting fetched again
                        val participants = post.getArray("participants")
                        if (participants != null) {
                            for (i in 0 until participants.size()) {
                                val participant = participants.getMap(i)

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
                    threadParticipantUsers.forEach{ (userId, user) ->
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
    return results
}
