package com.mattermost.helpers

import android.content.Context
import android.os.Bundle
import android.text.TextUtils
import androidx.core.content.edit
import org.json.JSONArray
import org.json.JSONObject

/**
 * Persists recent messaging-style notification messages per conversation so
 * Android Auto can read back conversation history, not only the latest push.
 */
object NotificationConversationStore {
    private const val PREFS_NAME = "NOTIFICATION_CONVERSATION_HISTORY"
    private const val MAX_MESSAGES_PER_CONVERSATION = 10

    data class ConversationMessage(
        val postId: String?,
        val senderId: String,
        val senderName: String,
        val text: String,
        val timestamp: Long,
    )

    fun conversationKey(bundle: Bundle): String? {
        val serverUrl = bundle.getString("server_url") ?: return null
        val groupId = groupId(bundle) ?: return null
        return "$serverUrl|$groupId"
    }

    fun groupId(bundle: Bundle): String? {
        val channelId = bundle.getString("channel_id")
        val rootId = bundle.getString("root_id")
        val isCrtEnabled = bundle.getString("is_crt_enabled") == "true"
        return if (isCrtEnabled && !TextUtils.isEmpty(rootId)) rootId else channelId
    }

    fun appendMessage(context: Context, bundle: Bundle, message: ConversationMessage) {
        val key = conversationKey(bundle) ?: return
        val messages = getMessages(context, key).toMutableList()
        if (!message.postId.isNullOrEmpty() && messages.any { it.postId == message.postId }) {
            return
        }
        messages.add(message)
        while (messages.size > MAX_MESSAGES_PER_CONVERSATION) {
            messages.removeAt(0)
        }
        saveMessages(context, key, messages)
    }

    fun getMessages(context: Context, bundle: Bundle): List<ConversationMessage> {
        val key = conversationKey(bundle) ?: return emptyList()
        return getMessages(context, key)
    }

    fun clearConversation(context: Context, bundle: Bundle) {
        val key = conversationKey(bundle) ?: return
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit {
            remove(key)
        }
    }

    fun clearChannelOrThread(context: Context, serverUrl: String?, channelId: String?, rootId: String?, isCrtEnabled: Boolean) {
        if (serverUrl.isNullOrEmpty() || channelId.isNullOrEmpty()) {
            return
        }
        val groupId = if (isCrtEnabled && !rootId.isNullOrEmpty()) rootId else channelId
        val key = "$serverUrl|$groupId"
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit {
            remove(key)
        }
    }

    private fun getMessages(context: Context, key: String): List<ConversationMessage> {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val raw = prefs.getString(key, null) ?: return emptyList()
        return try {
            val array = JSONArray(raw)
            buildList {
                for (i in 0 until array.length()) {
                    val obj = array.getJSONObject(i)
                    val postId = if (obj.has("post_id") && !obj.isNull("post_id")) {
                        obj.getString("post_id")
                    } else {
                        null
                    }
                    add(
                        ConversationMessage(
                            postId = postId,
                            senderId = obj.optString("sender_id", "sender_id"),
                            senderName = obj.optString("sender_name", ""),
                            text = obj.optString("text", ""),
                            timestamp = obj.optLong("timestamp", 0L),
                        )
                    )
                }
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    private fun saveMessages(context: Context, key: String, messages: List<ConversationMessage>) {
        val array = JSONArray()
        for (message in messages) {
            array.put(
                JSONObject().apply {
                    if (message.postId != null) {
                        put("post_id", message.postId)
                    } else {
                        put("post_id", JSONObject.NULL)
                    }
                    put("sender_id", message.senderId)
                    put("sender_name", message.senderName)
                    put("text", message.text)
                    put("timestamp", message.timestamp)
                }
            )
        }
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit {
            putString(key, array.toString())
        }
    }
}
