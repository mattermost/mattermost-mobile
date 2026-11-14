package com.mattermost.helpers

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.os.Bundle
import androidx.core.app.Person
import androidx.core.content.pm.ShortcutInfoCompat
import androidx.core.content.pm.ShortcutManagerCompat
import androidx.core.graphics.drawable.IconCompat
import com.mattermost.rnbeta.MainActivity
import com.mattermost.rnutils.helpers.NotificationHelper

/**
 * Publishes long-lived conversation shortcuts required for Android conversation /
 * Android Auto messaging notifications.
 */
object ConversationShortcutHelper {
    fun shortcutId(bundle: Bundle): String? {
        val key = NotificationConversationStore.conversationKey(bundle) ?: return null
        return "conversation_${key.hashCode()}"
    }

    fun publishShortcut(
        context: Context,
        bundle: Bundle,
        conversationTitle: String,
        persons: List<Person>,
        icon: Bitmap?,
    ): String? {
        val id = shortcutId(bundle) ?: return null
        val intent = Intent(context, MainActivity::class.java).apply {
            action = Intent.ACTION_VIEW
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra(CustomPushNotificationHelper.NOTIFICATION, Bundle(bundle))
            putExtra(CustomPushNotificationHelper.NOTIFICATION_ID, NotificationHelper.getNotificationId(bundle))
            bundle.getString("server_url")?.let { putExtra("server_url", it) }
            bundle.getString("channel_id")?.let { putExtra("channel_id", it) }
            bundle.getString("root_id")?.let { putExtra("root_id", it) }
            bundle.getString("post_id")?.let { putExtra("post_id", it) }
        }

        val label = conversationTitle.ifBlank { "Mattermost" }
        val builder = ShortcutInfoCompat.Builder(context, id)
            .setShortLabel(label.take(30))
            .setLongLabel(label)
            .setIntent(intent)
            .setIsConversation()

        if (persons.isNotEmpty()) {
            builder.setPersons(persons.toTypedArray())
            builder.setPerson(persons.first())
        }

        if (icon != null) {
            builder.setIcon(IconCompat.createWithBitmap(icon))
        }

        return try {
            val published = ShortcutManagerCompat.pushDynamicShortcut(context, builder.build())
            if (published) id else null
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    fun removeShortcut(context: Context, bundle: Bundle) {
        val id = shortcutId(bundle) ?: return
        try {
            ShortcutManagerCompat.removeDynamicShortcuts(context, listOf(id))
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
