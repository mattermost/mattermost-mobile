package com.mattermost.helpers

import android.content.Context
import android.os.Bundle
import android.text.TextUtils
import android.util.Log

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap

import com.mattermost.helpers.database_extension.*
import com.mattermost.helpers.push_notification.*

import kotlinx.coroutines.*
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

class PushNotificationDataHelper(private val context: Context) {
    private var coroutineScope = CoroutineScope(Dispatchers.Default)
    fun fetchAndStoreDataForPushNotification(initialData: Bundle) {
        val job = coroutineScope.launch(Dispatchers.Default) {
            PushNotificationDataRunnable.start(context, initialData)
        }
        runBlocking {
            job.join()
        }
    }
}

class PushNotificationDataRunnable {
    companion object {
        internal val specialMentions = listOf("all", "here", "channel")
        private val dbHelper = DatabaseHelper.instance!!
        private val mutex = Mutex()

        suspend fun start(context: Context, initialData: Bundle) {
            // for more info see: https://blog.danlew.net/2020/01/28/coroutines-and-java-synchronization-dont-mix/
            mutex.withLock {
                val serverUrl: String = initialData.getString("server_url") ?: return
                val db = dbHelper.getDatabaseForServer(context, serverUrl)

                try {
                    val teamId = initialData.getString("team_id")
                    val channelId = initialData.getString("channel_id")
                    val rootId = initialData.getString("root_id")
                    val isCRTEnabled = initialData.getString("is_crt_enabled") == "true"
                    Log.i("ReactNative", "Start fetching notification data in server=$serverUrl for channel=$channelId")

                    if (db != null) {
                        var teamData: ReadableMap? = null
                        var myTeamData: ReadableMap? = null
                        var channelData: ReadableMap? = null
                        var myChannelData: ReadableMap? = null
                        var loadedProfiles: ReadableArray? = null
                        var postData: ReadableMap?
                        var posts: ReadableMap? = null
                        var userIdsToLoad: ReadableArray? = null
                        var usernamesToLoad: ReadableArray? = null

                        var threads: ReadableArray? = null
                        var usersFromThreads: ReadableArray? = null
                        val receivingThreads = isCRTEnabled && !rootId.isNullOrEmpty()

                        coroutineScope {
                            if (teamId != null && !TextUtils.isEmpty(teamId)) {
                                val res = fetchTeamIfNeeded(db, serverUrl, teamId)
                                teamData = res.first
                                myTeamData = res.second
                            }

                            if (channelId != null) {
                                val channelRes = fetchMyChannel(db, serverUrl, channelId, isCRTEnabled)
                                channelData = channelRes.first
                                myChannelData = channelRes.second
                                loadedProfiles = channelRes.third

                                postData = fetchPosts(db, serverUrl, channelId, isCRTEnabled, rootId, loadedProfiles)

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
                            teamData?.let { insertTeam(db, it) }
                            myTeamData?.let { insertMyTeam(db, it) }
                            channelData?.let { handleChannel(db, it) }
                            myChannelData?.let { handleMyChannel(db, it) }

                            if (channelId != null) {
                                dbHelper.handlePosts(db, posts?.getMap("data"), channelId, receivingThreads)
                            }

                            threads?.let { handleThreads(db, it) }

                            loadedProfiles?.let { handleUsers(db, it) }
                            userIdsToLoad?.let { handleUsers(db, it) }
                            usernamesToLoad?.let { handleUsers(db, it) }
                            usersFromThreads?.let { handleUsers(db, it) }
                        }

                        Log.i("ReactNative", "Done processing push notification=$serverUrl for channel=$channelId")
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                } finally {
                    db?.close()
                    Log.i("ReactNative", "DONE fetching notification data")
                }
            }
        }
    }
}
