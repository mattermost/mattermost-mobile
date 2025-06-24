package com.mattermost.securepdfviewer.pdfium.shared

import android.util.Log
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.withContext
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger

/**
 * Coordinates all native PDF library access to prevent race conditions and memory corruption.
 * Uses a dedicated single thread for all native operations to ensure thread safety.
 */
class NativeAccessCoordinator {
    companion object {
        private const val TAG = "NativeAccessCoordinator"
    }

    // Single thread executor for all native operations
    private val nativeExecutor = Executors.newSingleThreadExecutor { r ->
        Thread(r, "PDFNativeThread").apply {
            isDaemon = true
            priority = Thread.NORM_PRIORITY + 1 // Slightly higher priority for responsiveness
        }
    }
    private val nativeDispatcher: CoroutineDispatcher = nativeExecutor.asCoroutineDispatcher()

    private val isShutdown = AtomicBoolean(false)
    private val activeOperations = AtomicInteger(0)

    /**
     * Executes a native operation safely on the dedicated native thread.
     * Operations are naturally serialized by the single thread executor.
     */
    suspend fun <T> withNativeAccess(
        operation: String,
        block: suspend () -> T
    ): T? {
        if (isShutdown.get()) {
            Log.d(TAG, "Skipping $operation - coordinator is shutdown")
            return null
        }

        return try {
            val operationId = activeOperations.incrementAndGet()
            Log.v(TAG, "Starting $operation (id: $operationId, active: ${activeOperations.get()})")

            // Execute on dedicated single thread - operations are naturally serialized
            withContext(nativeDispatcher) {
                if (isShutdown.get()) {
                    Log.d(TAG, "Aborting $operation - shutdown during execution")
                    return@withContext null
                }

                try {
                    block()
                } catch (e: Exception) {
                    Log.e(TAG, "Error in native operation $operation", e)
                    null
                }
            }
        } finally {
            val remaining = activeOperations.decrementAndGet()
            Log.v(TAG, "Completed $operation (remaining: $remaining)")
        }
    }

    /**
     * Shuts down the coordinator and waits for all operations to complete.
     */
    suspend fun shutdown() {
        if (isShutdown.compareAndSet(false, true)) {
            Log.d(TAG, "Shutting down coordinator, waiting for ${activeOperations.get()} operations")

            // Wait for all operations to complete with timeout
            val startTime = System.currentTimeMillis()
            while (activeOperations.get() > 0) {
                val elapsed = System.currentTimeMillis() - startTime
                if (elapsed > 3000) { // 3 second timeout
                    Log.w(TAG, "Timeout waiting for operations to complete. Remaining: ${activeOperations.get()}")
                    break
                }
                kotlinx.coroutines.delay(50)
            }

            // Shutdown the executor
            try {
                nativeExecutor.shutdown()
                Log.d(TAG, "Native executor shutdown")
            } catch (e: Exception) {
                Log.w(TAG, "Error shutting down native executor", e)
            }

            Log.d(TAG, "Coordinator shutdown complete")
        }
    }

}
