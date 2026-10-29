package com.mattermost.callsnative.receivers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.mattermost.callsnative.ui.CallActivity
import com.mattermost.callsnative.utils.CallPermissions
import com.mattermost.callsnative.managers.CallRegistry

/**
 * Handles the notification's Answer action. If RECORD_AUDIO is already
 * granted, signals answer directly; otherwise launches CallActivity to host
 * the runtime permission dialog (receivers can't request runtime perms).
 */
class AnswerReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION) return
        val uuid = intent.getStringExtra(EXTRA_UUID) ?: return

        if (CallPermissions.missingForAnswer(context).isEmpty()) {
            CallRegistry.requestUserAnswer(uuid)
            return
        }

        context.startActivity(CallActivity.answerIntent(context, uuid))
    }

    companion object {
        const val ACTION = "com.mattermost.callsnative.action.ANSWER"
        const val EXTRA_UUID = "com.mattermost.callsnative.extra.UUID"
    }
}
