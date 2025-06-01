package com.mattermost.securepdfviewer.model

/**
 * Data class representing the current memory state of the Android device.
 *
 * This class encapsulates device memory information used for making intelligent
 * decisions about PDF processing limits and memory management strategies within
 * the secure PDF viewer.
 *
 * The memory information is used to:
 * - Calculate safe PDF file size limits based on available memory
 * - Determine appropriate bitmap cache sizes for page rendering
 * - Implement adaptive memory management strategies
 * - Prevent out-of-memory crashes during large document processing
 *
 * Values are obtained from Android's ActivityManager.MemoryInfo and represent
 * the device's memory state at the time of measurement.
 *
 * @property totalMem Total amount of RAM available to the system in bytes
 * @property availMem Amount of available (free) RAM in bytes that can be allocated
 */
data class DeviceMemory(
    val totalMem: Long,
    val availMem: Long
)
