// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package com.mattermost.rnutils.helpers

import android.content.Context
import android.os.Bundle
import org.json.JSONObject
import java.util.Calendar

object OutOfOffice {
    fun shouldSuppress(context: Context, serverUrl: String?, payload: Bundle, now: Long = System.currentTimeMillis()): Boolean {
        if (serverUrl == null || payload.getString("type") in setOf("clear", "session")) return false
        val raw = context.getSharedPreferences("OutOfOffice", Context.MODE_PRIVATE)
            .getString("outOfOfficeSettings.$serverUrl", null) ?: return false
        return try {
            val settings = JSONObject(raw)
            val active = if (settings.has("schedule")) {
                settings.opt("schedule") == "weekly" && isWeeklyActive(settings, now)
            } else {
                val start = settings.optDouble("startAt", Double.NaN)
                val end = settings.optDouble("endAt", Double.NaN)
                settings.optBoolean("enabled") && start.isFinite() && end.isFinite() && now >= start && now < end
            }
            if (!active) {
                false
            } else {
                val isCall = payload.getString("type") == "call" || payload.getString("sub_type") == "calls"
                val mention = payload.get("is_mention")
                val isMention = mention == true || mention == "true"
                if (isCall) !settings.optBoolean("allowCalls") else !(isMention && settings.optBoolean("allowMentions"))
            }
        } catch (_: Exception) {
            // A malformed local preference must not permanently silence notifications.
            false
        }
    }

    private fun integerInRange(value: Any?, range: IntRange): Int? {
        val number = (value as? Number)?.toDouble() ?: return null
        if (!number.isFinite() || number != number.toInt().toDouble() || number.toInt() !in range) return null
        return number.toInt()
    }

    private fun isWeeklyActive(settings: JSONObject, now: Long): Boolean {
        val enabled = settings.opt("enabled") as? Boolean ?: return false
        val quietHoursEnabled = settings.opt("quietHoursEnabled") as? Boolean ?: return false
        if (settings.opt("allowCalls") !is Boolean || settings.opt("allowMentions") !is Boolean) return false
        val start = integerInRange(settings.opt("startMinute"), 0..1439) ?: return false
        val end = integerInRange(settings.opt("endMinute"), 0..1439) ?: return false
        if (quietHoursEnabled && start == end) return false
        val days = settings.optJSONArray("daysOff") ?: return false
        val daysOff = mutableSetOf<Int>()
        for (index in 0 until days.length()) {
            daysOff.add(integerInRange(days.opt(index), 0..6) ?: return false)
        }
        if (!enabled) return false
        // Calendar follows the device's current timezone, including DST and timezone changes.
        val local = Calendar.getInstance().apply { timeInMillis = now }
        val weekday = local.get(Calendar.DAY_OF_WEEK) - Calendar.SUNDAY
        if (weekday in daysOff) return true
        if (!quietHoursEnabled) return false
        val minute = local.get(Calendar.HOUR_OF_DAY) * 60 + local.get(Calendar.MINUTE)
        return if (start < end) minute >= start && minute < end else minute >= start || minute < end
    }

}
