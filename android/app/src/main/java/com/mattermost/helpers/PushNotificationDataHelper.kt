package com.mattermost.helpers

import android.content.Context
import android.os.Bundle
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableNativeArray
import com.nozbe.watermelondb.Database
import java.io.IOException
import java.util.concurrent.Executors
import kotlin.coroutines.*
import kotlinx.coroutines.*

class PushNotificationDataHelper(private val context: Context) {
    private var scope = Executors.newSingleThreadExecutor()
    fun fetchAndStoreDataForPushNotification(initialData: Bundle) {
        scope.execute(Runnable {
            runBlocking {
                PushNotificationDataRunnable.start(context, initialData)
            }
        })
    }
}

class PushNotificationDataRunnable {
    companion object {
        private val specialMentions = listOf("all", "here", "channel")

        @Synchronized
        suspend fun start(context: Context, initialData: Bundle) {
            try {
                val serverUrl: String = initialData.getString("server_url") ?: return
                val channelId = initialData.getString("channel_id")
                val rootId = initialData.getString("root_id")
                val isCRTEnabled = initialData.getString("is_crt_enabled") == "true"
                val db = DatabaseHelper.instance!!.getDatabaseForServer(context, serverUrl)
                Log.i("ReactNative", "Start fetching notification data in server="+serverUrl+" for channel="+channelId)

                if (db != null) {
                    var postData: ReadableMap?
                    var posts: ReadableMap? = null
                    var userIdsToLoad: ReadableArray? = null
                    var usernamesToLoad: ReadableArray? = null

                    var threads: ReadableArray? = null
                    var usersFromThreads: ReadableArray? = null
                    val receivingThreads = isCRTEnabled && !rootId.isNullOrEmpty()

                    coroutineScope {
                        if (channelId != null) {
                            postData = fetchPosts(db, serverUrl, channelId, isCRTEnabled, rootId)

                            posts = postData?.getMap("posts")
                            userIdsToLoad = postData?.getArray("userIdsToLoad")
                            usernamesToLoad = postData?.getArray("usernamesToLoad")
                            threads = postData?.getArray("threads")
                            usersFromThreads = postData?.getArray("usersFromThreads")

                            if (userIdsToLoad != null && userIdsToLoad!!.size() > 0) {
                                val users = fetchUsersById(serverUrl, userIdsToLoad!!)
                                userIdsToLoad = users?.getArray("data")
                            }

                            if (usernamesToLoad != null && usernamesToLoad!!.size() > 0) {
                                val users = fetchUsersByUsernames(serverUrl, usernamesToLoad!!)
                                usernamesToLoad = users?.getArray("data")
                            }
                        }
                    }

                    db.transaction {
                        if (posts != null && channelId != null) {
                            DatabaseHelper.instance!!.handlePosts(db, posts!!.getMap("data"), channelId, receivingThreads)
                        }

                        if (threads != null) {
                            DatabaseHelper.instance!!.handleThreads(db, threads!!)
                        }

                        if (userIdsToLoad != null && userIdsToLoad!!.size() > 0) {
                            DatabaseHelper.instance!!.handleUsers(db, userIdsToLoad!!)
                        }

                        if (usernamesToLoad != null && usernamesToLoad!!.size() > 0) {
                            DatabaseHelper.instance!!.handleUsers(db, usernamesToLoad!!)
                        }

                        if (usersFromThreads != null) {
                            DatabaseHelper.instance!!.handleUsers(db, usersFromThreads!!)
                        }
                    }

                    db.close()
                    Log.i("ReactNative", "Done processing push notification="+serverUrl+" for channel="+channelId)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        private suspend fun fetchPosts(db: Database, serverUrl: String, channelId: String, isCRTEnabled: Boolean, rootId: String?): ReadableMap? {
            val regex = Regex("""\B@(([a-z0-9-._]*[a-z0-9_])[.-]*)""", setOf(RegexOption.IGNORE_CASE))
            val since = DatabaseHelper.instance!!.queryPostSinceForChannel(db, channelId)
            val currentUserId = DatabaseHelper.instance!!.queryCurrentUserId(db)?.removeSurrounding("\"")
            val currentUser = DatabaseHelper.instance!!.find(db, "User", currentUserId)
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
                        val posts = ReadableMapUtils.toWritableMap(postsMap as? Map<String, Any>)
                        val iterator = posts.keySetIterator()
                        val userIds = mutableListOf<String>()
                        val usernames = mutableListOf<String>()

                        val threads = WritableNativeArray()
                        val threadParticipantUserIds = mutableListOf<String>() // Used to exclude the "userIds" present in the thread participants
                        val threadParticipantUsernames = mutableListOf<String>() // Used to exclude the "usernames" present in the thread participants
                        val threadParticipantUsers = HashMap<String, ReadableMap>() // All unique users from thread participants are stored here

                        while(iterator.hasNextKey()) {
                            val key = iterator.nextKey()
                            val post = posts.getMap(key)
                            val userId = post?.getString("user_id")
                            if (userId != null && userId != currentUserId && !userIds.contains(userId)) {
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
                                            if (!threadParticipantUserIds.contains(participantId)) {
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

                        val existingUserIds = DatabaseHelper.instance!!.queryIds(db, "User", userIds.toTypedArray())
                        val existingUsernames = DatabaseHelper.instance!!.queryByColumn(db, "User", "username", usernames.toTypedArray())
                        userIds.removeAll { it in existingUserIds }
                        usernames.removeAll { it in existingUsernames }

                        if (threadParticipantUserIds.size > 0) {
                            // Do not fetch users found in thread participants as we get the user's data in the posts response already
                            userIds.removeAll { it in threadParticipantUserIds }
                            usernames.removeAll { it in threadParticipantUsernames }

                            // Get users from thread participants
                            val existingThreadParticipantUserIds = DatabaseHelper.instance!!.queryIds(db, "User", threadParticipantUserIds.toTypedArray())

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

        private suspend fun fetchUsersById(serverUrl: String, userIds: ReadableArray): ReadableMap? {
            val endpoint = "api/v4/users/ids"
            val options = Arguments.createMap()
            options.putArray("body", ReadableArrayUtils.toWritableArray(ReadableArrayUtils.toArray(userIds)))
            return fetchWithPost(serverUrl, endpoint, options)
        }

        private suspend fun fetchUsersByUsernames(serverUrl: String, usernames: ReadableArray): ReadableMap? {
            val endpoint = "api/v4/users/usernames"
            val options = Arguments.createMap()
            options.putArray("body", ReadableArrayUtils.toWritableArray(ReadableArrayUtils.toArray(usernames)))
            return fetchWithPost(serverUrl, endpoint, options)
        }

        private suspend fun fetch(serverUrl: String, endpoint: String): ReadableMap? {
            return suspendCoroutine { cont ->
                Network.get(serverUrl, endpoint, null, object : ResolvePromise() {
                    override fun resolve(value: Any?) {
                        val response = value as ReadableMap?
                        if (response != null && !response.getBoolean("ok")) {
                            val error = response.getMap("data")
                            cont.resumeWith(Result.failure((IOException("Unexpected code ${error?.getInt("status_code")} ${error?.getString("message")}"))))
                        } else {
                            cont.resumeWith(Result.success(response))
                        }
                    }

                    override fun reject(code: String, message: String) {
                        cont.resumeWith(Result.failure(IOException("Unexpected code $code $message")))
                    }

                    override fun reject(reason: Throwable?) {
                        cont.resumeWith(Result.failure(IOException("Unexpected code $reason")))
                    }
                })
            }
        }

        private suspend fun fetchWithPost(serverUrl: String, endpoint: String, options: ReadableMap?) : ReadableMap? {
            return suspendCoroutine { cont ->
                Network.post(serverUrl, endpoint, options, object : ResolvePromise() {
                    override fun resolve(value: Any?) {
                        val response = value as ReadableMap?
                        cont.resumeWith(Result.success(response))
                    }

                    override fun reject(code: String, message: String) {
                        cont.resumeWith(Result.failure(IOException("Unexpected code $code $message")))
                    }

                    override fun reject(reason: Throwable?) {
                        cont.resumeWith(Result.failure(IOException("Unexpected code $reason")))
                    }
                })
            }
        }
    }
}
