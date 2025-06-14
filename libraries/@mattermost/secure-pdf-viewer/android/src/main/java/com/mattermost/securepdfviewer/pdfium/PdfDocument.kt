package com.mattermost.securepdfviewer.pdfium

import android.util.Log
import com.mattermost.pdfium.PdfBridge
import com.mattermost.pdfium.exceptions.DocumentOpenException
import com.mattermost.pdfium.exceptions.InvalidPasswordException
import com.mattermost.pdfium.exceptions.PasswordRequiredException
import com.mattermost.securepdfviewer.pdfium.shared.PdfContext
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Represents a PDF document, managing its lifecycle, pages, and caching.
 */
class PdfDocument private constructor(
    private val context: PdfContext,
    private val pdfBridge: PdfBridge,
) {

    companion object {
        private const val TAG = "PdfDocument"

        /**
         * Opens a PDF document from the specified file path with optional password authentication.
         *
         * This method uses PdfBridge for native document loading and authentication.
         *
         * @param filePath Absolute path to the PDF file to open
         * @param password Optional password for encrypted documents (null for unencrypted)
         * @return PdfDocument instance.
         * @throws PasswordRequiredException if document requires password but none provided
         * @throws InvalidPasswordException if provided password is incorrect
         * @throws DocumentOpenException for other opening errors (corrupted file, unsupported format, etc.)
         */
        @Throws(PasswordRequiredException::class, InvalidPasswordException::class, DocumentOpenException::class)
        fun openDocument(context: PdfContext, filePath: String, password: String? = null): PdfDocument {
            try {
                val bridge = PdfBridge.open(filePath, password)
                return PdfDocument(context, bridge)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to open document", e)
                when (e) {
                    is PasswordRequiredException,
                    is InvalidPasswordException -> throw e
                    else -> throw DocumentOpenException("Failed to open document: ${e.message}", e)
                }
            }
        }
    }

    // Thread-safe destruction state
    private val isDestroyed = AtomicBoolean(false)

    // Page instance cache
    private val pageInstances = ConcurrentHashMap<Int, PdfPage>()

    /**
     * Gets the total number of pages, using the cache.
     *
     * @return Page count or 0 if destroyed.
     */
    fun getPageCount(): Int {
        return if (isDestroyed.get()) {
            Log.w(TAG, "Document destroyed, returning 0 pages")
            0
        } else {
            context.cacheManager.getPageCount() ?: pdfBridge.getPageCount().also {
                context.cacheManager.setPageCount(it)
            }
        }
    }

    /**
     * Gets the size of a specific page using native coordinator for thread safety.
     */
    suspend fun getPageSizeSafe(pageNumber: Int, skipCache: Boolean? = false): Pair<Float, Float>? {
        if (isDestroyed.get()) {
            Log.w(TAG, "Document destroyed")
            return null
        }

        // Check cache first
        if (skipCache != true) {
            val cached = context.cacheManager.withSynchronizedCache {
                context.cacheManager.getPageSize(pageNumber)
            }
            if (cached != null) {
                return cached
            }
        }

        // Use native coordinator for safe access
        return context.nativeCoordinator.withNativeAccess("get-page-size-$pageNumber") {
            try {
                pdfBridge.getPageSize(pageNumber).also {
                    context.cacheManager.withSynchronizedCache {
                        context.cacheManager.setPageSize(pageNumber, it)
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error getting page size for page $pageNumber", e)
                null
            }
        }
    }

    /**
     * Gets the size of a specific page.
     *
     * @param pageNumber Page index.
     * @return Page size or null if destroyed.
     */
    fun getPageSize(pageNumber: Int, skipCache: Boolean? = false): Pair<Float, Float>? {
        if (isDestroyed.get()) {
            Log.w(TAG, "Document destroyed")
            return null
        }
        if (skipCache == true) {
            return pdfBridge.getPageSize(pageNumber)
        }
        return context.cacheManager.getPageSize(pageNumber) ?: pdfBridge.getPageSize(pageNumber).also {
            context.cacheManager.setPageSize(pageNumber, it)
        }
    }

    /**
     * Gets a PdfPage instance for the given page number, with caching.
     *
     * @param pageNumber Page index.
     * @return PdfPage instance.
     */
    fun getPage(pageNumber: Int): PdfPage {
        if (isDestroyed.get()) {
            throw IllegalStateException("Document has been destroyed")
        }

        val pageCount = getPageCount()
        if (pageNumber !in 0 until pageCount) {
            throw IndexOutOfBoundsException("Page $pageNumber out of range [0, ${pageCount - 1}]")
        }

        return pageInstances.computeIfAbsent(pageNumber) {
            PdfPage(context, pdfBridge, pageNumber)
        }
    }

    /**
     * Checks if the document is valid (not destroyed + native valid).
     *
     * @return True if valid, false otherwise.
     */
    fun isValid(): Boolean {
        if (isDestroyed.get()) return false
        return try {
            pdfBridge.isValid()
        } catch (e: Exception) {
            Log.w(TAG, "Document validation failed", e)
            false
        }
    }

    /**
     * Closes the document and clears all caches.
     */
    fun destroy() {
        if (isDestroyed.compareAndSet(false, true)) {
            Log.d(TAG, "Destroying document")
            pageInstances.clear()
            try {
                pdfBridge.close()
                Log.d(TAG, "Document destroyed successfully")
            } catch (e: Exception) {
                Log.w(TAG, "Error destroying document", e)
            }
        }
    }
}
