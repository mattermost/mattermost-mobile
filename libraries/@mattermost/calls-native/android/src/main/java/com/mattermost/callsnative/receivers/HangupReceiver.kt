package com.mattermost.callsnative.receivers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.mattermost.callsnative.managers.CallRegistry

class HangupReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != HANGUP_ACTION) return
        val uuid = intent.getStringExtra(HANGUP_UUID_EXTRA) ?: return
        CallRegistry.requestUserHangup(uuid)
    }

    companion object {
        const val HANGUP_ACTION = "com.mattermost.callsnative.action.HANGUP"
        const val HANGUP_UUID_EXTRA = "com.mattermost.callsnative.extra.UUID"
    }
}
