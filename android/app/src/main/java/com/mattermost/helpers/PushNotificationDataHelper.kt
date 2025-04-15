package com.mattermost.helpers

import android.content.Context
import android.os.Bundle
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.mattermost.helpers.database_extension.getDatabaseForServer
import com.mattermost.helpers.database_extension.saveToDatabase
import com.mattermost.helpers.push_notification.addToDefaultCategoryIfNeeded
import com.mattermost.helpers.push_notification.fetchMyChannel
import com.mattermost.helpers.push_notification.fetchMyTeamCategories
import com.mattermost.helpers.push_notification.fetchNeededUsers
import com.mattermost.helpers.push_notification.fetchPosts
import com.mattermost.helpers.push_notification.fetchTeamIfNeeded
import com.mattermost.helpers.push_notification.fetchThread
import com.mattermost.turbolog.TurboLog
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext

class PushNotificationDataHelper(private val context: Context) {
    suspend fun fetchAndStoreDataForPushNotification(initialData: Bundle, isReactInit: Boolean): Bundle? {
        return withContext(Dispatchers.Default) {
            PushNotificationDataRunnable.start(context, initialData, isReactInit)
        }
    }
}

class PushNotificationDataRunnable {
    companion object {
        internal val specialMentions = listOf("all", "here", "channel")
        private val dbHelper = DatabaseHelper.instance!!
        private val mutex = Mutex()

        suspend fun start(context: Context, initialData: Bundle, isReactInit: Boolean): Bundle? {
            mutex.withLock {
                // for more info see: https://blog.danlew.net/2020/01/28/coroutines-and-java-synchronization-dont-mix/
                val serverUrl: String = initialData.getString("server_url") ?: return null
                val db = dbHelper.getDatabaseForServer(context, serverUrl)
                var result: Bundle? = null

                try {
                    if (db != null) {
                        val teamId = initialData.getString("team_id")
                        val channelId = initialData.getString("channel_id")
                        val postId = initialData.getString("post_id")
                        val rootId = initialData.getString("root_id")
                        val isCRTEnabled = initialData.getString("is_crt_enabled") == "true"
                        val ackId = initialData.getString("ack_id")

                        TurboLog.i("ReactNative", "Start fetching notification data in server=$serverUrl for channel=$channelId and ack=$ackId")

                        val receivingThreads = isCRTEnabled && !rootId.isNullOrEmpty()
                        val notificationData = Arguments.createMap()

                        var channel: ReadableMap? = null
                        var myTeam: ReadableMap? = null

                        if (!teamId.isNullOrEmpty()) {
                            val res = fetchTeamIfNeeded(db, serverUrl, teamId)
                            res.first?.let { notificationData.putMap("team", it) }

                            myTeam = res.second
                            myTeam?.let { notificationData.putMap("myTeam", it) }
                        }

                        if (channelId != null && postId != null) {
                            val channelRes = fetchMyChannel(db, serverUrl, channelId, isCRTEnabled)

                            channel = channelRes.first
                            channel?.let { notificationData.putMap("channel", it) }
                            channelRes.second?.let { notificationData.putMap("myChannel", it) }
                            val loadedProfiles = channelRes.third

                            // Fetch categories if needed
                            if (!teamId.isNullOrEmpty() && myTeam != null) {
                                // should load all categories
                                val res = fetchMyTeamCategories(db, serverUrl, teamId)
                                res?.let { notificationData.putMap("categories", it) }
                            } else if (channel != null) {
                                // check if the channel is in the category for the team
                                val res = addToDefaultCategoryIfNeeded(db, channel)
                                res?.let { notificationData.putArray("categoryChannels", it) }
                            }

                            val postData = fetchPosts(db, serverUrl, channelId, isCRTEnabled, rootId, loadedProfiles)
                            postData?.getMap("posts")?.let { notificationData.putMap("posts", it) }

                            var notificationThread: ReadableMap? = null
                            if (isCRTEnabled && !rootId.isNullOrEmpty()) {
                                notificationThread = fetchThread(db, serverUrl, rootId, teamId)
                            }

                            getThreadList(notificationThread, postData?.getArray("threads"))?.let {
                                val threadsArray = Arguments.createArray()
                                for (item in it) {
                                    threadsArray.pushMap(item)
                                }
                                notificationData.putArray("threads", threadsArray)
                            }

                            val userList = fetchNeededUsers(serverUrl, loadedProfiles, postData)
                            notificationData.putArray("users", ReadableArrayUtils.toWritableArray(userList.toArray()))
                        }

                        result = Arguments.toBundle(notificationData)

                        if (!isReactInit) {
                            dbHelper.saveToDatabase(db, notificationData, teamId, channelId, receivingThreads)
                        }

                        TurboLog.i("ReactNative", "Done processing push notification=$serverUrl for channel=$channelId and ack=$ackId")
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                    val eMessage = e.message ?: "Error with no message"
                    TurboLog.e("ReactNative", "Error processing push notification error=$eMessage")
                } finally {
                    db?.close()
                    TurboLog.i("ReactNative", "DONE fetching notification data")
                }

                return result
            }
        }

        private fun getThreadList(notificationThread: ReadableMap?, threads: ReadableArray?): ArrayList<ReadableMap>? {
            threads?.let {
                val threadsArray = ArrayList<ReadableMap>()
                val threadIds = ArrayList<String>()
                notificationThread?.let { thread ->
                    thread.getString("id")?.let { it1 -> threadIds.add(it1) }
                    threadsArray.add(thread)
                }
                for(i in 0 until it.size()) {
                    val thread = it.getMap(i)
                    val threadId = thread.getString("id")
                    if (threadId != null) {
                        if (threadIds.contains(threadId)) {
                         // replace the values for participants and is_following
                            val index = threadsArray.indexOfFirst { el -> el.getString("id") == threadId }
                            val prev = threadsArray[index]
                            val merge = Arguments.createMap()
                            merge.merge(prev)
                            merge.putBoolean("is_following", thread.getBoolean("is_following"))
                            merge.putArray("participants", thread.getArray("participants"))
                            threadsArray[index] = merge
                        } else {
                            threadsArray.add(thread)
                            threadIds.add(threadId)
                        }
                    }
                }
                return threadsArray
            }

            return null
        }
    }
}
