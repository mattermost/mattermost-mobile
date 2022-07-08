package com.mattermost.helpers

import android.content.Context
import android.os.Bundle
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
        private val specialMentions = listOf<String>("all", "here", "channel")
        @Synchronized
        suspend fun start(context: Context, initialData: Bundle) {
            try {
                val serverUrl: String = initialData.getString("server_url") ?: return
                val channelId = initialData.getString("channel_id")
                val rootId = initialData.getString("root_id")
                val isCRTEnabled = initialData.getString("is_crt_enabled") == "true"
                val db = DatabaseHelper.instance!!.getDatabaseForServer(context, serverUrl)

                if (db != null) {
                    var postData: ReadableMap?
                    var posts: ReadableMap? = null
                    var userIdsToLoad: ReadableArray? = null
                    var usernamesOrGroupsToLoad: ReadableArray? = null

                    var fetchedUsers: ReadableArray? = null
                    var fetchedGroups: MutableList<ReadableMap>? = null

                    var threads: ReadableArray? = null
                    var usersFromThreads: ReadableArray? = null
                    val receivingThreads = isCRTEnabled && !rootId.isNullOrEmpty()

                    coroutineScope {
                        if (channelId != null) {
                            postData = fetchPosts(db, serverUrl, channelId, isCRTEnabled, rootId)

                            posts = postData?.getMap("posts")
                            userIdsToLoad = postData?.getArray("userIdsToLoad")
                            usernamesOrGroupsToLoad = postData?.getArray("usernamesOrGroupsToLoad")
                            threads = postData?.getArray("threads")
                            usersFromThreads = postData?.getArray("usersFromThreads")

                            if (userIdsToLoad != null && userIdsToLoad!!.size() > 0) {
                                val users = fetchUsersById(serverUrl, userIdsToLoad!!)
                                userIdsToLoad = users?.getArray("data")
                            }

                            if (usernamesOrGroupsToLoad != null && usernamesOrGroupsToLoad!!.size() > 0) {
                                val users = fetchUsersByUsernames(serverUrl, usernamesOrGroupsToLoad!!)
                                fetchedUsers = users?.getArray("data")

                                // Check for groups as well
                                fetchedGroups = fetchGroupsByNames(serverUrl, usernamesOrGroupsToLoad!!);
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

                        if (fetchedUsers != null && fetchedUsers!!.size() > 0) {
                            DatabaseHelper.instance!!.handleUsers(db, fetchedUsers!!)
                        }

                        if (fetchedGroups != null && fetchedGroups!!.size > 0) {
                            DatabaseHelper.instance!!.handleGroups(db, fetchedGroups!!)
                        }

                        if (usersFromThreads != null) {
                            DatabaseHelper.instance!!.handleUsers(db, usersFromThreads!!)
                        }
                    }

                    db.close()
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

            var endpoint: String
            val receivingThreads = isCRTEnabled && !rootId.isNullOrEmpty()
            if (receivingThreads) {
                var queryParams = "?skipFetchThreads=false&perPage=60&fromCreatedAt=0&direction=up"
                endpoint = "/api/v4/posts/$rootId/thread$queryParams$additionalParams"
            } else {
                var queryParams = if (since == null) "?page=0&per_page=60" else "?since=${since.toLong()}"
                endpoint = "/api/v4/channels/$channelId/posts$queryParams$additionalParams"
            }

            val postsResponse = fetch(serverUrl, endpoint)
            val results = Arguments.createMap()

            if (postsResponse != null) {
                val data = ReadableMapUtils.toMap(postsResponse)
                results.putMap("posts", postsResponse)
                val postsData = data.get("data") as? Map<*, *>
                if (postsData != null) {
                    val postsMap = postsData.get("posts")
                    if (postsMap != null) {
                        val posts = ReadableMapUtils.toWritableMap(postsMap as? Map<String, Object>)
                        val iterator = posts.keySetIterator()
                        val userIds = mutableListOf<String>()
                        val usernamesOrGroups = mutableListOf<String>()

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
                                    val matchString = it.value.removePrefix("@")
                                    if (!usernamesOrGroups.contains(matchString) && currentUsername != matchString && !specialMentions.contains(matchString)) {
                                        usernamesOrGroups.add(matchString)
                                    }
                                }
                            }

                            if (isCRTEnabled) {
                                // Add root post as a thread
                                val rootId = post?.getString("root_id")
                                if (rootId.isNullOrEmpty()) {
                                    threads.pushMap(post!!)
                                }

                                // Add participant userIds and usernames to exclude them from getting fetched again
                                val participants = post.getArray("participants")
                                if (participants != null) {
                                    for (i in 0 until participants.size()) {
                                        val participant = participants.getMap(i)

                                        val userId = participant.getString("id")
                                        if (userId != currentUserId && userId != null) {
                                            if (!threadParticipantUserIds.contains(userId)) {
                                                threadParticipantUserIds.add(userId)
                                            }

                                            if (!threadParticipantUsers.containsKey(userId)) {
                                                threadParticipantUsers[userId!!] = participant
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
                        val existingUsernames = DatabaseHelper.instance!!.queryByColumn(db, "User", "username", usernamesOrGroups.toTypedArray())
                        val existingGroups = DatabaseHelper.instance!!.queryByColumn(db, "Group", "name", usernamesOrGroups.toTypedArray())
                        userIds.removeAll { it in existingUserIds }
                        usernamesOrGroups.removeAll { it in existingUsernames }
                        usernamesOrGroups.removeAll { it in existingGroups }

                        if (threadParticipantUserIds.size > 0) {
                            // Do not fetch users found in thread participants as we get the user's data in the posts response already
                            userIds.removeAll { it in threadParticipantUserIds }
                            usernamesOrGroups.removeAll { it in threadParticipantUsernames }

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

                        if (usernamesOrGroups.size > 0) {
                            results.putArray("usernamesOrGroupsToLoad", ReadableArrayUtils.toWritableArray(usernamesOrGroups.toTypedArray()))
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
            return fetchWithPost(serverUrl, endpoint, options);
        }

        private suspend fun fetchUsersByUsernames(serverUrl: String, usernames: ReadableArray): ReadableMap? {
            val endpoint = "api/v4/users/usernames"
            val options = Arguments.createMap()
            options.putArray("body", ReadableArrayUtils.toWritableArray(ReadableArrayUtils.toArray(usernames)))
            return fetchWithPost(serverUrl, endpoint, options);
        }

        private suspend fun fetchGroupsByNames(serverUrl: String, strings: ReadableArray): MutableList<ReadableMap> {
            var fetchedGroups = mutableListOf<ReadableMap>()

            for (s in strings.toArrayList()){
                val endpoint = "api/v4/groups?q=${s}";
                val response = fetch(serverUrl, endpoint)
                val groups = response!!.getArray("data")

                if(groups != null && groups.size() > 0) {
                    groups.toArrayList().forEach {
                        it as ReadableMap
                        fetchedGroups.add(it)
                    }
                }
            }


            return fetchedGroups;
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
