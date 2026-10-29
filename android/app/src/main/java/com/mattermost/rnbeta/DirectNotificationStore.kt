package com.mattermost.rnbeta

import android.content.Context
import androidx.core.content.edit

/**
 * Small native copy of the per-server delivery mode. FCM can arrive while the
 * React Native runtime is stopped, so suppression must not depend on JS state.
 */
object DirectNotificationStore {
    private const val PREFERENCES_NAME = "encma_notification_delivery"
    private const val MODE_KEY_PREFIX = "mode:"

    const val MODE_DIRECT = "direct"
    const val MODE_SERVER_PUSH = "server_push"
    const val MODE_OFF = "off"

    private fun normalizeServerUrl(serverUrl: String): String {
        return serverUrl.trim().trimEnd('/')
    }

    private fun modeKey(serverUrl: String): String {
        return MODE_KEY_PREFIX + normalizeServerUrl(serverUrl)
    }

    fun setMode(context: Context, serverUrl: String, mode: String) {
        require(mode == MODE_DIRECT || mode == MODE_SERVER_PUSH || mode == MODE_OFF) {
            "Unknown notification delivery mode"
        }
        context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE).edit {
            putString(modeKey(serverUrl), mode)
        }
    }

    fun removeServer(context: Context, serverUrl: String) {
        context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE).edit {
            remove(modeKey(serverUrl))
        }
    }

    fun shouldSuppressFcm(context: Context, serverUrl: String?): Boolean {
        if (serverUrl.isNullOrBlank()) {
            return false
        }
        val mode = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .getString(modeKey(serverUrl), MODE_SERVER_PUSH)
        return mode == MODE_DIRECT || mode == MODE_OFF
    }
}
