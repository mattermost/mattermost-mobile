package com.mattermost.helpers.push_notification

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.mattermost.helpers.PushNotificationDataRunnable
import com.mattermost.helpers.ReadableArrayUtils

internal suspend fun PushNotificationDataRunnable.Companion.fetchUsersById(serverUrl: String, userIds: ReadableArray): ReadableArray? {
    return try {
        val endpoint = "api/v4/users/ids"
        val options = Arguments.createMap()
        options.putArray("body", ReadableArrayUtils.toWritableArray(ReadableArrayUtils.toArray(userIds)))
        val result = fetchWithPost(serverUrl, endpoint, options)
        result?.getArray("data")
    } catch (e: Exception) {
        e.printStackTrace()
        null
    }
}

internal suspend fun PushNotificationDataRunnable.Companion.fetchUsersByUsernames(serverUrl: String, usernames: ReadableArray): ReadableArray? {
    return try {
        val endpoint = "api/v4/users/usernames"
        val options = Arguments.createMap()
        options.putArray("body", ReadableArrayUtils.toWritableArray(ReadableArrayUtils.toArray(usernames)))
        val result = fetchWithPost(serverUrl, endpoint, options)
        result?.getArray("data")
    } catch (e: Exception) {
        e.printStackTrace()
        null
    }
}

internal suspend fun PushNotificationDataRunnable.Companion.fetchNeededUsers(serverUrl: String, loadedUsers: ReadableArray?, data: ReadableMap?): ArrayList<Any> {
    val userList = ArrayList<Any>()
    loadedUsers?.let { PushNotificationDataRunnable.addUsersToList(it, userList) }
    data?.getArray("userIdsToLoad")?.let { ids ->
        if (ids.size() > 0) {
            val result = fetchUsersById(serverUrl, ids)
            result?.let { PushNotificationDataRunnable.addUsersToList(it, userList) }
        }
    }

    data?.getArray("usernamesToLoad")?.let { ids ->
        if (ids.size() > 0) {
            val result = fetchUsersByUsernames(serverUrl, ids)
            result?.let { PushNotificationDataRunnable.addUsersToList(it, userList) }
        }
    }

    data?.getArray("usersFromThreads")?.let { PushNotificationDataRunnable.addUsersToList(it, userList) }

    return userList
}

internal fun PushNotificationDataRunnable.Companion.addUsersToList(users: ReadableArray, list: ArrayList<Any>) {
    for (i in 0 until users.size()) {
        list.add(users.getMap(i))
    }
}
