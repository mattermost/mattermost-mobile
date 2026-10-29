package com.mattermost.callsnative.utils

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat

/**
 * Runtime-permission policy for answering a call. Single source of truth for
 * the permission set required to join, used by both [com.mattermost.callsnative.ui.CallActivity] (which
 * hosts the request dialog) and [com.mattermost.callsnative.receivers.AnswerReceiver] (which decides whether the
 * notification's Answer button can fast-path or has to spawn the Activity).
 *
 * Rules:
 *  - RECORD_AUDIO is required. Without it answering would join a call that
 *    can't transmit audio, so we treat denial as a failed call.
 *  - BLUETOOTH_CONNECT is optional and only exists on API 31+. We bundle it
 *    into the same request so the user sees one permission sheet; the BT
 *    outcome doesn't gate the answer.
 */
internal object CallPermissions {
    fun isMicGranted(context: Context): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) ==
            PackageManager.PERMISSION_GRANTED

    /** Returns the subset of [requiredForAnswer] that aren't yet granted.
     *  Empty list ⇒ the answer flow can proceed without prompting. */
    fun missingForAnswer(context: Context): List<String> = requiredForAnswer().filter {
        ContextCompat.checkSelfPermission(context, it) != PackageManager.PERMISSION_GRANTED
    }

    /** Full permission set we may ask for when answering. BT entry is only
     *  added on API 31+ where the runtime permission actually exists. */
    private fun requiredForAnswer(): List<String> = buildList {
        add(Manifest.permission.RECORD_AUDIO)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            add(Manifest.permission.BLUETOOTH_CONNECT)
        }
    }
}
