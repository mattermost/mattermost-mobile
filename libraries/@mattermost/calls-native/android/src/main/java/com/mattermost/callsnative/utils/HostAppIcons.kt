package com.mattermost.callsnative.utils

import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager

/**
 * Resolves host-app resources by name.
 */
@SuppressLint("DiscouragedApi")
internal object HostAppIcons {

    /** The host app's launcher icon (usually adaptive). Used as the avatar
     *  placeholder and as the Person icon on CallStyle notifications. */
    fun launcher(context: Context): Int {
        return try {
            val info = context.packageManager.getApplicationInfo(
                context.packageName,
                PackageManager.GET_META_DATA,
            )
            info.icon
        } catch (_: Exception) {
            android.R.drawable.sym_def_app_icon
        }
    }

    /** Monochrome status-bar / notification small icon. The host app's
     *  `mipmap/ic_notification` is the same asset the regular push pipeline
     *  uses; falling back to the launcher icon gives the OS a chance to
     *  render *something* (likely a generic dot) if the host doesn't ship one. */
    fun notificationSmall(context: Context): Int {
        val id = context.resources.getIdentifier("ic_notification", "mipmap", context.packageName)
        return if (id != 0) id else launcher(context)
    }

    /** The host app's splash background (per-density PNG). Used as the
     *  CallActivity background so the surface visually matches the
     *  splash-screen branding. Returns 0 when the host doesn't ship one;
     *  callers should degrade gracefully. */
    fun splashBackground(context: Context): Int {
        return context.resources.getIdentifier("splash_background", "drawable", context.packageName)
    }

    /** The host app's user-visible label (e.g. "Mattermost"). Used to fill the
     *  `{applicationName}` placeholder in caller-name fallbacks. Falls back to
     *  the package name if the label can't be resolved. */
    fun appLabel(context: Context): String {
        return try {
            val info = context.packageManager.getApplicationInfo(context.packageName, 0)
            context.packageManager.getApplicationLabel(info).toString()
        } catch (_: Exception) {
            context.packageName
        }
    }
}
