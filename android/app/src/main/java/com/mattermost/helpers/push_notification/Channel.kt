package com.mattermost.helpers.push_notification

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.mattermost.helpers.PushNotificationDataRunnable
import com.mattermost.helpers.database_extension.findChannel
import com.mattermost.helpers.database_extension.getCurrentUserLocale
import com.mattermost.helpers.database_extension.getTeammateDisplayNameSetting
import com.mattermost.helpers.database_extension.queryCurrentUserId
import com.nozbe.watermelondb.WMDatabase
import java.text.Collator
import java.util.Locale

suspend fun PushNotificationDataRunnable.Companion.fetchMyChannel(db: WMDatabase, serverUrl: String, channelId: String, isCRTEnabled: Boolean): Triple<ReadableMap?, ReadableMap?, ReadableArray?> {
    val channel = fetch(serverUrl, "/api/v4/channels/$channelId")
    var channelData = channel?.getMap("data")
    val myChannelData = channelData?.let { fetchMyChannelData(serverUrl, channelId, isCRTEnabled, it) }
    val channelType = channelData?.getString("type")
    var profilesArray: ReadableArray? = null

    if (channelData != null && channelType != null && !findChannel(db, channelId)) {
        val displayNameSetting = getTeammateDisplayNameSetting(db)

        when (channelType) {
            "D" -> {
                profilesArray = fetchProfileInChannel(db, serverUrl, channelId)
                if ((profilesArray?.size() ?: 0) > 0) {
                    val displayName = displayUsername(profilesArray!!.getMap(0), displayNameSetting)
                    val data = Arguments.createMap()
                    data.merge(channelData)
                    data.putString("display_name", displayName)
                    channelData = data
                }
            }
            "G" -> {
                profilesArray = fetchProfileInChannel(db, serverUrl, channelId)
                if ((profilesArray?.size() ?: 0) > 0) {
                    val localeString = getCurrentUserLocale(db)
                    val localeArray = localeString.split("-")
                    val locale = if (localeArray.size == 1) {
                        Locale(localeString)
                    } else {
                        Locale(localeArray[0], localeArray[1])
                    }
                    val displayName = displayGroupMessageName(profilesArray!!, locale, displayNameSetting)
                    val data = Arguments.createMap()
                    data.merge(channelData)
                    data.putString("display_name", displayName)
                    channelData = data
                }
            }
            else -> {}
        }
    }

    return Triple(channelData, myChannelData, profilesArray)
}

private suspend fun PushNotificationDataRunnable.Companion.fetchMyChannelData(serverUrl: String, channelId: String, isCRTEnabled: Boolean, channelData: ReadableMap): ReadableMap? {
    try {
        val myChannel = fetch(serverUrl, "/api/v4/channels/$channelId/members/me")
        val myChannelData = myChannel?.getMap("data")
        if (myChannelData != null) {
            val data = Arguments.createMap()
            data.merge(myChannelData)
            data.putString("id", channelId)

            val totalMsg = if (isCRTEnabled) {
                channelData.getInt("total_msg_count_root")
            } else {
                channelData.getInt("total_msg_count")
            }

            val myMsgCount = if (isCRTEnabled) {
                myChannelData.getInt("msg_count_root")
            } else {
                myChannelData.getInt("msg_count")
            }

            val mentionCount = if (isCRTEnabled) {
                myChannelData.getInt("mention_count_root")
            } else {
                myChannelData.getInt("mention_count")
            }

            val lastPostAt = if (isCRTEnabled) {
                try {
                    channelData.getDouble("last_root_post_at")
                } catch (e: Exception) {
                    channelData.getDouble("last_post_at")
                }
            } else {
                channelData.getDouble("last_post_at")
            }

            val messageCount = 0.coerceAtLeast(totalMsg - myMsgCount)
            data.putInt("message_count", messageCount)
            data.putInt("mentions_count", mentionCount)
            data.putBoolean("is_unread", messageCount > 0)
            data.putDouble("last_post_at", lastPostAt)
            return data
        }
    } catch (e: Exception) {
        e.printStackTrace()
    }

    return null
}

private suspend fun PushNotificationDataRunnable.Companion.fetchProfileInChannel(db: WMDatabase, serverUrl: String, channelId: String): ReadableArray? {
    return try {
        val currentUserId = queryCurrentUserId(db)
        val profilesInChannel = fetch(serverUrl, "/api/v4/users?in_channel=${channelId}&page=0&per_page=8&sort=")
        val profilesArray = profilesInChannel?.getArray("data")
        val result = Arguments.createArray()
        if (profilesArray != null) {
            for (i in 0 until profilesArray.size()) {
                val profile = profilesArray.getMap(i)
                if (profile.getString("id") != currentUserId) {
                    result.pushMap(profile)
                }
            }
        }

        result
    } catch (e: Exception) {
        e.printStackTrace()
        null
    }
}

private fun PushNotificationDataRunnable.Companion.displayUsername(user: ReadableMap, displayNameSetting: String): String {
    val name = user.getString("username") ?: ""
    val nickname = user.getString("nickname")
    val firstName = user.getString("first_name") ?: ""
    val lastName = user.getString("last_name") ?: ""
    return when (displayNameSetting) {
        "nickname_full_name" -> {
            (nickname ?: "$firstName $lastName").trim()
        }
        "full_name" -> {
            "$firstName $lastName".trim()
        }
        else -> {
            name.trim()
        }
    }
}

private fun PushNotificationDataRunnable.Companion.displayGroupMessageName(profilesArray: ReadableArray, locale: Locale, displayNameSetting: String): String {
    val names = ArrayList<String>()
    for (i in 0 until profilesArray.size()) {
        val profile = profilesArray.getMap(i)
        names.add(displayUsername(profile, displayNameSetting))
    }

    return names.sortedWith { s1, s2 ->
        Collator.getInstance(locale).compare(s1, s2)
    }.joinToString(", ").trim()
}
