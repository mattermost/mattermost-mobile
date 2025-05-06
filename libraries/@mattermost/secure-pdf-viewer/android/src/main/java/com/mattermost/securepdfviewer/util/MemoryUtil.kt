package com.mattermost.securepdfviewer.util

import android.app.ActivityManager
import android.content.Context
import com.mattermost.securepdfviewer.model.DeviceMemory

object MemoryUtil {
    private fun getDeviceMemoryInfo(context: Context): DeviceMemory {
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val memoryInfo = ActivityManager.MemoryInfo()
        activityManager.getMemoryInfo(memoryInfo)
        return DeviceMemory(memoryInfo.totalMem, memoryInfo.availMem)
    }

    fun getMaxPdfSize(context: Context): Long {
        val memoryInfo = getDeviceMemoryInfo(context)
        val totalMem = memoryInfo.totalMem
        val availMem = memoryInfo.availMem

        val baseLimit = when {
            totalMem >= 6L * 1024 * 1024 * 1024 -> 500L * 1024 * 1024  // 6GB+: 500MB
            totalMem >= 4L * 1024 * 1024 * 1024 -> 300L * 1024 * 1024  // 4–6GB: 300MB
            totalMem >= 2L * 1024 * 1024 * 1024 -> 150L * 1024 * 1024  // 2–4GB: 150MB
            else -> 75L * 1024 * 1024  // <2GB: 75MB
        }

        return when {
            availMem < 500L * 1024 * 1024 -> minOf(baseLimit, 100L * 1024 * 1024) // Low available RAM
            availMem > 2L * 1024 * 1024 * 1024 -> (baseLimit * 1.2).toLong()      // Generous boost
            else -> baseLimit
        }
    }
}
