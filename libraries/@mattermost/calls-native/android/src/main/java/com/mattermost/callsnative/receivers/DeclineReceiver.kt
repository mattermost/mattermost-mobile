package com.mattermost.callsnative.receivers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.mattermost.callsnative.managers.CallRegistry

class DeclineReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION) return
        val uuid = intent.getStringExtra(EXTRA_UUID) ?: return
        CallRegistry.requestUserDecline(uuid)
    }

    companion object {
        const val ACTION = "com.mattermost.callsnative.action.DECLINE"
        const val EXTRA_UUID = "com.mattermost.callsnative.extra.UUID"
    }
}
