package com.mattermost.securepdfviewer.util

import android.app.ActivityManager
import android.content.Context
import com.mattermost.securepdfviewer.model.DeviceMemory

/**
 * Memory management utilities for safe PDF processing operations.
 *
 * This utility object provides intelligent memory analysis and PDF file size limit
 * calculations to prevent out-of-memory crashes during PDF processing. It implements
 * adaptive memory management strategies that adjust processing limits based on the
 * current device capabilities and memory availability.
 *
 * The utility is essential for maintaining application stability when dealing with
 * large PDF documents, as PDF rendering can be memory-intensive due to:
 * - High-resolution page rendering and bitmap caching
 * - Multiple page preloading for smooth scrolling
 * - Document structure parsing and metadata extraction
 * - Vector graphics and image processing within PDFs
 *
 * Memory management strategy:
 * - **Device Profiling**: Categorizes devices by total RAM capacity
 * - **Dynamic Assessment**: Considers current available memory
 * - **Conservative Limits**: Applies safety margins to prevent crashes
 * - **Adaptive Scaling**: Adjusts limits based on real-time memory conditions
 */
object MemoryUtil {

    // Device memory information access

    /**
     * Retrieves comprehensive device memory information.
     *
     * This method queries the Android system's ActivityManager to obtain current
     * memory statistics, providing both total device RAM and currently available
     * memory. This information is essential for making informed decisions about
     * PDF processing limits and memory allocation strategies.
     *
     * The returned data represents the memory state at the time of the call and
     * can be used to assess whether the device has sufficient resources to safely
     * process a PDF document of a given size.
     *
     * @param context Application context for accessing system services
     * @return DeviceMemory object containing total and available memory information
     */
    private fun getDeviceMemoryInfo(context: Context): DeviceMemory {
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val memoryInfo = ActivityManager.MemoryInfo()
        activityManager.getMemoryInfo(memoryInfo)
        return DeviceMemory(memoryInfo.totalMem, memoryInfo.availMem)
    }

    // PDF size limit calculation

    /**
     * Calculates the maximum safe PDF file size for processing on the current device.
     *
     * This method implements an intelligent, multi-factor algorithm to determine
     * the largest PDF file size that can be safely processed without risking
     * out-of-memory crashes. The calculation considers both hardware capabilities
     * and current memory conditions to provide adaptive limits.
     *
     * Algorithm factors:
     * 1. **Device RAM Tier**: Base limits scaled by total device memory
     *    - 6GB+ devices: 500MB base limit (high-end devices)
     *    - 4-6GB devices: 300MB base limit (mid-range devices)
     *    - 2-4GB devices: 150MB base limit (budget devices)
     *    - <2GB devices: 75MB base limit (low-end devices)
     *
     * 2. **Available Memory Adjustment**: Dynamic scaling based on current conditions
     *    - Low memory (<500MB available): Conservative limit (max 100MB)
     *    - High memory (>2GB available): Generous boost (+20%)
     *    - Normal conditions: Use base limit
     *
     * 3. **Safety Margins**: Built-in buffers to account for:
     *    - System memory fragmentation
     *    - Other application memory usage
     *    - PDF rendering overhead (typically 3-5x file size)
     *    - Android system memory requirements
     *
     * @param context Application context for accessing memory information
     * @return Maximum recommended PDF file size in bytes
     */
    fun getMaxPdfSize(context: Context): Long {
        val memoryInfo = getDeviceMemoryInfo(context)
        val totalMem = memoryInfo.totalMem
        val availMem = memoryInfo.availMem

        // Determine base limit based on device RAM tier
        val baseLimit = when {
            totalMem >= 6L * 1024 * 1024 * 1024 -> 500L * 1024 * 1024  // 6GB+: 500MB
            totalMem >= 4L * 1024 * 1024 * 1024 -> 300L * 1024 * 1024  // 4–6GB: 300MB
            totalMem >= 2L * 1024 * 1024 * 1024 -> 150L * 1024 * 1024  // 2–4GB: 150MB
            else -> 75L * 1024 * 1024  // <2GB: 75MB
        }

        // Apply dynamic adjustments based on current memory availability
        return when {
            availMem < 500L * 1024 * 1024 -> minOf(baseLimit, 100L * 1024 * 1024) // Low available RAM
            availMem > 2L * 1024 * 1024 * 1024 -> (baseLimit * 1.2).toLong()      // Generous boost
            else -> baseLimit
        }
    }
}
