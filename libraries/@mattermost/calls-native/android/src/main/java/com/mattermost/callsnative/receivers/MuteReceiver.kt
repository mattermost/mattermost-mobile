package com.mattermost.callsnative.receivers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.mattermost.callsnative.managers.CallsBridge

class MuteReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION) return
        val uuid = intent.getStringExtra(EXTRA_UUID) ?: return
        val muted = intent.getBooleanExtra(EXTRA_MUTED, false)
        CallsBridge.send(CallsBridge.Event.CallMuted, mapOf("uuid" to uuid, "muted" to muted))
    }

    companion object {
        const val ACTION = "com.mattermost.callsnative.action.MUTE"
        const val EXTRA_UUID = "com.mattermost.callsnative.extra.UUID"
        const val EXTRA_MUTED = "com.mattermost.callsnative.extra.MUTED"
    }
}
