package com.mattermost.securepdfviewer.mupdf.manager

import android.util.Log
import com.mattermost.securepdfviewer.mupdf.MuPDFDocument
import com.mattermost.securepdfviewer.mupdf.interaction.ZoomAnimator.Companion.MIN_ZOOM_SCALE
import com.mattermost.securepdfviewer.mupdf.MuPDFView
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Manages PDF document loading, state, and lifecycle for the PDF viewer.
 *
 * This class handles:
 * - Document loading with password support
 * - Document state management and validation
 * - Loading progress tracking and error handling
 * - Document cleanup and resource management
 * - Document information API
 * - Callback management for loading events
 *
 * The manager ensures proper document lifecycle management with thread-safe
 * operations and comprehensive error handling for robust document loading.
 */
internal class DocumentManager(private val view: MuPDFView) {

    companion object {
        private const val TAG = "DocumentManager"
    }

    // Document State

    @Volatile var document: MuPDFDocument? = null
        private set

    // View state flags for thread-safe operations
    private val isDocumentLoading = AtomicBoolean(false)
    private val isViewDestroyed = AtomicBoolean(false)

    // Display properties - direct access
    var currentPage = 0
        internal set

    var isViewReady = false
        private set

    // Public API

    /**
     * Gets whether the document is currently loading.
     */
    fun isDocumentLoading(): Boolean = isDocumentLoading.get()

    /**
     * Gets whether the view has been destroyed.
     */
    fun isViewDestroyed(): Boolean = isViewDestroyed.get()

    /**
     * Gets the total number of pages in the currently loaded document.
     *
     * @return Number of pages, or 0 if no document is loaded
     */
    fun getPageCount(): Int = document?.getPageCount() ?: 0

    /**
     * Marks the view as ready for rendering.
     */
    fun markViewReady() {
        isViewReady = true
    }

    // Document Loading

    /**
     * Loads a PDF document from the specified file path with optional password protection.
     *
     * This method handles the complete document loading lifecycle including:
     * - Cleanup of any previously loaded document
     * - Background loading to avoid blocking the UI thread
     * - Password authentication for protected documents
     * - Initial page size calculation and layout setup
     * - Error handling with appropriate callback notifications
     *
     * @param filePath Absolute path to the PDF file on the device storage
     * @param password Optional password for encrypted PDF documents
     */
    fun loadDocument(filePath: String, password: String? = null) {
        if (!isDocumentLoading.compareAndSet(false, true)) {
            Log.w(TAG, "Document already loading, ignoring request")
            return
        }

        view.viewScope.launch {
            try {
                Log.d(TAG, "Loading document: $filePath")

                safeCleanup()

                val newDocument = withContext(Dispatchers.IO) {
                    MuPDFDocument.openDocument(filePath, password)
                }

                if (isViewDestroyed.get()) {
                    Log.d(TAG, "View destroyed during load")
                    newDocument?.destroy()
                    return@launch
                }

                if (newDocument?.isValid() == true) {
                    val pageCount = newDocument.getPageCount()
                    if (pageCount <= 0) {
                        Log.e(TAG, "Document loaded but has no pages")
                        newDocument.destroy()
                        view.onLoadError?.invoke(Exception("Document has no pages"))
                        return@launch
                    }

                    document = newDocument
                    currentPage = 0

                    Log.d(TAG, "Document loaded: $pageCount pages")

                    if (view.width > 0 && view.height > 0) {
                        view.zoomAnimator.calculateBaseZoom()
                        view.pageCacheManager.preCalculateAllPageSizes()
                        view.layoutCalculator.updateDocumentLayout()
                        isViewReady = true
                        view.pageRenderer.renderCurrentPage()
                    }

                    view.onLoadComplete?.invoke()
                } else {
                    Log.e(TAG, "Failed to load document")
                    view.onLoadError?.invoke(Exception("Failed to load document"))
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error loading document", e)
                view.onLoadError?.invoke(e)
            } finally {
                isDocumentLoading.set(false)
                Log.d(TAG, "Document loading completed, flag reset")
            }
        }
    }

    // Document lifecycle

    /**
     * Safely cleans up all document resources and cached bitmaps.
     *
     * This method ensures proper cleanup of native resources to prevent memory leaks:
     * - Stops all ongoing rendering operations
     * - Recycles all cached bitmaps
     * - Destroys the MuPDF document on a background thread
     * - Resets all view state to initial values
     */
    fun safeCleanup() {
        Log.d(TAG, "Safe cleanup started")

        // Stop any ongoing animations and rendering
        view.scroller.forceFinished(true)
        view.scrollGestureListener.stopCustomFlinging()
        view.zoomAnimator.reset()

        // Clean up cache
        view.pageCacheManager.cleanup()

        val docToDestroy = document
        document = null

        if (docToDestroy != null) {
            view.viewScope.launch(Dispatchers.IO) {
                try {
                    docToDestroy.destroy()
                    Log.d(TAG, "Document destroyed in background")
                } catch (e: Exception) {
                    Log.w(TAG, "Error destroying document", e)
                }
            }
        }

        isViewReady = false
        view.scrollHandler.scrollY = 0f
        view.scrollHandler.scrollX = 0f
        view.scrollHandler.totalDocumentHeight = 0f

        Log.d(TAG, "Safe cleanup completed")
    }

    /**
     * Handles view detachment and cleanup.
     */
    fun onDetachedFromWindow() {
        Log.d(TAG, "View detached")
        isViewDestroyed.set(true)
        safeCleanup()
    }

    // Navigation support

    /**
     * Jumps to the specified page with smooth scrolling animation.
     *
     * Handles both zoomed and normal view states, with immediate positioning
     * when zoomed for accuracy and animated scrolling at base zoom.
     *
     * @param pageNum 0-based page number to navigate to
     */
    fun jumpToPage(pageNum: Int) {
        try {
            val doc = document ?: return
            val pageCount = doc.getPageCount()

            if (pageNum < 0 || pageNum >= pageCount) {
                Log.w(TAG, "Invalid page number for jump: $pageNum (valid: 0-${pageCount-1})")
                return
            }

            synchronized(view.pageCacheManager.cacheAccessLock) {
                val targetOffset = if (view.zoomAnimator.currentZoomScale > MIN_ZOOM_SCALE + 0.1f) {
                    view.layoutCalculator.calculatePageOffsetRealTime(pageNum, view.zoomAnimator.baseZoom * view.zoomAnimator.currentZoomScale)
                } else {
                    view.pageCacheManager.pageOffsets[pageNum] ?: return
                }

                val currentDocumentHeight = if (view.zoomAnimator.currentZoomScale > MIN_ZOOM_SCALE + 0.1f) {
                    view.layoutCalculator.calculateTotalDocumentHeightWithZoom(view.zoomAnimator.baseZoom * view.zoomAnimator.currentZoomScale)
                } else {
                    view.scrollHandler.totalDocumentHeight
                }

                val maxScroll = maxOf(0f, currentDocumentHeight - view.height)
                val targetScroll = targetOffset.coerceIn(0f, maxScroll)

                // Stop any ongoing animations
                view.scroller.forceFinished(true)
                view.scrollGestureListener.stopCustomFlinging()

                if (view.zoomAnimator.currentZoomScale > MIN_ZOOM_SCALE + 0.1f) {
                    // Immediate positioning when zoomed for accuracy
                    view.scrollHandler.scrollY = targetScroll
                    view.invalidate()
                    Log.d(TAG, "Jumped to page $pageNum at zoom ${view.zoomAnimator.currentZoomScale} (immediate)")
                } else {
                    // Smooth animation at base zoom
                    view.scroller.startScroll(
                        0, view.scrollHandler.scrollY.toInt(),
                        0, (targetScroll - view.scrollHandler.scrollY).toInt(),
                        300
                    )
                    view.invalidate()
                    Log.d(TAG, "Jumping to page $pageNum with animation")
                }

                view.invalidate()
                Log.d(TAG, "Jumping to page $pageNum")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error jumping to page $pageNum", e)
        }
    }
}
