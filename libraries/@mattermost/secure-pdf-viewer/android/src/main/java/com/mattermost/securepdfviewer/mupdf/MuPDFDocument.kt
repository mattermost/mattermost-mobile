package com.mattermost.securepdfviewer.mupdf

import android.util.Log
import com.artifex.mupdf.fitz.Document
import com.mattermost.securepdfviewer.mupdf.exceptions.DocumentOpenException
import com.mattermost.securepdfviewer.mupdf.exceptions.InvalidPasswordException
import com.mattermost.securepdfviewer.mupdf.exceptions.PasswordRequiredException
import com.mattermost.securepdfviewer.mupdf.cache.DocumentCacheManager
import com.mattermost.securepdfviewer.mupdf.util.DocumentOpener
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Thread-safe wrapper for MuPDF Document with optimized page size caching.
 *
 * This class provides a secure, efficient interface to MuPDF native Document class,
 * offering enhanced functionality specifically designed for the secure PDF viewer's
 * requirements. It addresses several limitations of the raw MuPDF API while providing
 * additional safety and performance optimizations.
 *
 * Key features and benefits:
 * - **Thread Safety**: All operations are thread-safe, allowing concurrent access from multiple threads
 * - **Resource Management**: Automatic cleanup and lifecycle management to prevent memory leaks
 * - **Performance Optimization**: Intelligent caching of page metadata to avoid repeated expensive operations
 * - **Security**: Secure password authentication with proper error handling
 * - **Robustness**: Comprehensive error handling and validation to prevent crashes
 *
 * The class implements a caching strategy for page sizes and counts to minimize expensive
 * native calls to MuPDF, significantly improving performance when working with large documents
 * or when accessing page information repeatedly.
 *
 * @param document The underlying MuPDF Document instance (managed internally)
 * @param filePath The file path of the opened document
 */
class MuPDFDocument private constructor(
    private val document: Document,
    private val filePath: String
) {

    // Thread-safe state management
    private val isDestroyed = AtomicBoolean(false)

    // Performance optimization cache manager
    private val cacheManager = DocumentCacheManager()

    companion object {
        private const val TAG = "MuPDFDocument"

        // Document creation and initialization

        /**
         * Opens a PDF document from the specified file path with optional password authentication.
         *
         * This factory method handles the complete document opening process, including:
         * - Native document loading through MuPDF
         * - Password authentication for encrypted documents
         * - Initial validation and setup
         * - Proper error handling and resource cleanup on failure
         *
         * @param filePath Absolute path to the PDF file to open
         * @param password Optional password for encrypted documents (null for unencrypted)
         * @return Successfully opened MuPDFDocument instance, or null if opening fails
         * @throws PasswordRequiredException if document requires password but none provided
         * @throws InvalidPasswordException if provided password is incorrect
         * @throws DocumentOpenException for other opening errors (corrupted file, unsupported format, etc.)
         */
        fun openDocument(filePath: String, password: String? = null): MuPDFDocument? {
            return try {
                val document = DocumentOpener.openDocument(filePath, password)
                MuPDFDocument(document, filePath)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to create MuPDFDocument", e)
                when (e) {
                    is PasswordRequiredException,
                    is InvalidPasswordException,
                    is DocumentOpenException -> throw e
                    else -> throw DocumentOpenException("Failed to open document: ${e.message}", e)
                }
            }
        }
    }

    // Document metadata access

    /**
     * Gets the total number of pages in the document with caching for performance.
     *
     * This method provides thread-safe access to the document's page count, utilizing
     * an internal cache to avoid repeated expensive native calls. The page count is
     * cached after the first successful retrieval and reused for subsequent calls.
     *
     * @return Total number of pages in the document, or 0 if document is invalid/destroyed
     */
    fun getPageCount(): Int {
        return if (isDestroyed.get()) {
            Log.w(TAG, "Document destroyed, returning 0 pages")
            0
        } else {
            cacheManager.getPageCount(document)
        }
    }

    /**
     * Gets the size of a specific page without loading the full page object.
     *
     * This method provides efficient access to page dimensions by utilizing a cache
     * to store previously retrieved page sizes. This is significantly more efficient
     * than loading the entire page object when only size information is needed.
     *
     * The returned dimensions are in PDF coordinate units (typically 72 DPI points)
     * and represent the page's natural size before any scaling or transformations.
     *
     * @param pageNumber 0-based page index to retrieve size for
     * @return Pair of (width, height) in PDF coordinate units, or null if invalid page
     */
    fun getPageSize(pageNumber: Int): Pair<Float, Float>? {
        if (isDestroyed.get()) {
            Log.w(TAG, "Document destroyed")
            return null
        }

        val pageCount = getPageCount()
        return cacheManager.getPageSize(document, pageNumber, pageCount)
    }

    // Page access and manipulation

    /**
     * Loads a specific page for rendering or content access.
     *
     * This method provides access to individual pages for rendering operations,
     * link extraction, or other page-specific operations. The returned MuPDFPage
     * object wraps the native MuPDF page and provides additional safety and
     * functionality.
     *
     * Important: The caller is responsible for calling destroy() on the returned
     * MuPDFPage when finished to free native resources.
     *
     * @param pageNumber 0-based page index to load
     * @return MuPDFPage wrapper for the loaded page
     * @throws IllegalStateException if document has been destroyed
     * @throws IndexOutOfBoundsException if page number is outside valid range
     */
    fun getPage(pageNumber: Int): MuPDFPage {
        if (isDestroyed.get()) {
            throw IllegalStateException("Document has been destroyed")
        }

        val pageCount = getPageCount()
        if (pageCount <= 0) {
            throw IllegalStateException("Document has no pages or is invalid")
        }

        if (pageNumber < 0 || pageNumber >= pageCount) {
            throw IndexOutOfBoundsException("Page $pageNumber out of range [0, ${pageCount - 1}]")
        }

        val page = document.loadPage(pageNumber)
        return MuPDFPage(page, pageNumber, this)
    }

    // Document state and lifecycle management

    /**
     * Checks if the document is valid and available for operations.
     *
     * A document is considered valid if:
     * - It has not been explicitly destroyed
     * - The underlying native document is still accessible
     * - Basic document operations can be performed
     *
     * @return true if document is valid and can be used, false otherwise
     */
    fun isValid(): Boolean {
        if (isDestroyed.get()) return false

        return try {
            document.countPages() >= 0
        } catch (e: Exception) {
            Log.w(TAG, "Document validation failed", e)
            false
        }
    }

    /**
     * Destroys the document and frees all associated native resources.
     *
     * This method performs complete cleanup of the document and all associated
     * resources. It is thread-safe and can be called multiple times without
     * side effects. After calling this method, the document becomes invalid
     * and should not be used for any operations.
     *
     * The cleanup process includes:
     * - Clearing all internal caches
     * - Destroying the native MuPDF document
     * - Marking the document as destroyed to prevent further use
     */
    fun destroy() {
        if (isDestroyed.compareAndSet(false, true)) {
            Log.d(TAG, "Destroying document")

            cacheManager.clearCache()

            try {
                document.destroy()
                Log.d(TAG, "Document destroyed successfully")
            } catch (e: Exception) {
                Log.w(TAG, "Error destroying document", e)
            }
        }
    }
}
