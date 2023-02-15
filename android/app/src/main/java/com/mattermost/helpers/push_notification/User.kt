package com.mattermost.helpers.push_notification

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.mattermost.helpers.PushNotificationDataRunnable
import com.mattermost.helpers.ReadableArrayUtils

internal suspend fun PushNotificationDataRunnable.Companion.fetchUsersById(serverUrl: String, userIds: ReadableArray): ReadableMap? {
    val endpoint = "api/v4/users/ids"
    val options = Arguments.createMap()
    options.putArray("body", ReadableArrayUtils.toWritableArray(ReadableArrayUtils.toArray(userIds)))
    return fetchWithPost(serverUrl, endpoint, options)
}

internal suspend fun PushNotificationDataRunnable.Companion.fetchUsersByUsernames(serverUrl: String, usernames: ReadableArray): ReadableMap? {
    val endpoint = "api/v4/users/usernames"
    val options = Arguments.createMap()
    options.putArray("body", ReadableArrayUtils.toWritableArray(ReadableArrayUtils.toArray(usernames)))
    return fetchWithPost(serverUrl, endpoint, options)
}
