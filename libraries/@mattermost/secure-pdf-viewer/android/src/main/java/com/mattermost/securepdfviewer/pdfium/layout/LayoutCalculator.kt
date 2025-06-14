package com.mattermost.securepdfviewer.pdfium.layout

import android.util.Log
import com.mattermost.securepdfviewer.pdfium.PdfView.Companion.PAGE_SPACING
import com.mattermost.securepdfviewer.pdfium.interaction.ZoomAnimator.Companion.MIN_ZOOM_SCALE
import com.mattermost.securepdfviewer.pdfium.shared.PdfContext
import com.mattermost.securepdfviewer.pdfium.shared.PdfViewInterface
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong
import kotlin.coroutines.cancellation.CancellationException

/**
 * Handles all document layout calculations for the PDF viewer.
 *
 * This class manages:
 * - Page positioning and offset calculations
 * - Document height calculations at various zoom levels
 * - Page visibility detection and bounds calculations
 * - Multi-page and single-page layout logic
 * - Real-time layout calculations during animations
 *
 * The calculator handles both cached layout values for performance and
 * real-time calculations during zoom animations to prevent layout jumping.
 */
class LayoutCalculator(
    private val context: PdfContext,
    private val view: PdfViewInterface
) {

    companion object {
        private const val TAG = "LayoutCalculator"
        private const val DEFERRED_PAGE_SIZE_START_INDEX = 10
        private const val IDLE_THRESHOLD_MS = 500L
        private const val RENDER_SETTLE_CHECK_DELAY = 60L
    }

    private val estimatedPageSizeSet = mutableSetOf<Int>()
    private val isPaused = AtomicBoolean(false)
    private val lastRenderTime = AtomicLong(0L)
    private var deferredJob: Job? = null

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
            val doc = context.document
            val pageCount = doc.getPageCount()

            if (pageNum < 0 || pageNum >= pageCount) {
                Log.w(TAG, "Invalid page number for jump: $pageNum (valid: 0-${pageCount-1})")
                return
            }

            context.cacheManager.withSynchronizedCache {
                val targetOffset = if (context.zoomAnimator.currentZoomScale > MIN_ZOOM_SCALE + 0.1f) {
                    calculatePageOffsetRealTime(pageNum, context.zoomAnimator.baseZoom * context.zoomAnimator.currentZoomScale)
                } else {
                    context.cacheManager.getPageOffset(pageNum) ?: return@withSynchronizedCache
                }

                val currentDocumentHeight = if (context.zoomAnimator.currentZoomScale > MIN_ZOOM_SCALE + 0.1f) {
                    calculateTotalDocumentHeightWithZoom(context.zoomAnimator.baseZoom * context.zoomAnimator.currentZoomScale)
                } else {
                    context.scrollHandler.totalDocumentHeight
                }

                val maxScroll = maxOf(0f, currentDocumentHeight - view.viewHeight)
                val targetScroll = targetOffset.coerceIn(0f, maxScroll)

                // Stop any ongoing animations
                context.scroller.forceFinished(true)
                context.scrollGestureListener.stopCustomFlinging()

                if (context.zoomAnimator.currentZoomScale > MIN_ZOOM_SCALE + 0.1f) {
                    // Immediate positioning when zoomed for accuracy
                    context.scrollHandler.scrollY = targetScroll
                    view.invalidate()
                    Log.d(TAG, "Jumped to page $pageNum at zoom ${context.zoomAnimator.currentZoomScale} (immediate)")
                } else {
                    // Smooth animation at base zoom
                    context.scroller.startScroll(
                        0, context.scrollHandler.scrollY.toInt(),
                        0, (targetScroll - context.scrollHandler.scrollY).toInt(),
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

    /**
     * Updates the document layout based on current zoom scale.
     *
     * Recalculates page positions and total document height when zoom changes,
     * with special handling for single-page documents which are vertically centered.
     */
    fun updateDocumentLayout() {
        val doc = context.document

        try {
            val pageCount = doc.getPageCount()
            var currentOffset = PAGE_SPACING.toFloat()
            val effectiveZoom = context.zoomAnimator.baseZoom * context.zoomAnimator.currentZoomScale
            context.cacheManager.withSynchronizedCache {
                context.cacheManager.clearPageOffsets()

                if (pageCount == 1) {
                    val pageSize = context.cacheManager.getPageSize(0)
                    if (pageSize != null) {
                        val scaledHeight = pageSize.second * effectiveZoom
                        // Center single pages vertically for better presentation
                        val centeredOffset = maxOf(PAGE_SPACING.toFloat(), (view.viewHeight - scaledHeight) / 2f)
                        context.cacheManager.setPageOffset(0, centeredOffset)
                        context.scrollHandler.totalDocumentHeight = centeredOffset + scaledHeight + PAGE_SPACING
                    }
                } else {
                    // Multi-page documents use sequential layout
                    for (i in 0 until pageCount) {
                        val originalPageSize = context.cacheManager.getPageSize(i)
                        if (originalPageSize == null) {
                            Log.w(TAG, "No page size for page $i during layout update")
                            continue
                        }

                        context.cacheManager.setPageOffset(i, currentOffset)

                        val scaledHeight = originalPageSize.second * effectiveZoom
                        currentOffset += scaledHeight + PAGE_SPACING
                    }

                    context.scrollHandler.totalDocumentHeight = currentOffset
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error updating document layout", e)
        }
    }

    /**
     * Calculates page offset in real-time during zoom animations.
     *
     * Used during zoom animations to prevent layout jumping by calculating
     * page positions dynamically instead of using cached values.
     */
    fun calculatePageOffsetRealTime(pageNum: Int, effectiveZoom: Float): Float {
        val doc = context.document
        val pageCount = doc.getPageCount()

        try {
            // Special handling for single-page documents
            if (pageCount == 1 && pageNum == 0) {
                val pageSize = doc.getPageSize(0) ?: return PAGE_SPACING.toFloat()
                val scaledHeight = pageSize.second * effectiveZoom
                return maxOf(PAGE_SPACING.toFloat(), (view.viewHeight - scaledHeight) / 2f)
            }

            // Sequential calculation for multi-page documents
            var currentOffset = PAGE_SPACING.toFloat()
            for (i in 0 until pageNum) {
                val pageSize = doc.getPageSize(i) ?: continue
                val scaledHeight = pageSize.second * effectiveZoom
                currentOffset += scaledHeight + PAGE_SPACING
            }
            return currentOffset
        } catch (e: Exception) {
            Log.e(TAG, "Error calculating real-time offset for page $pageNum", e)
            return PAGE_SPACING.toFloat()
        }
    }

    /**
     * Calculates total document height with specified zoom level.
     *
     * Used for scroll constraint calculations and scroll handle positioning
     * when zoom level differs from current cached layout.
     */
    fun calculateTotalDocumentHeightWithZoom(effectiveZoom: Float): Float {
        val doc = context.document
        val pageCount = doc.getPageCount()

        try {
            if (pageCount == 1) {
                val pageSize = doc.getPageSize(0) ?: return PAGE_SPACING.toFloat() * 2
                val scaledHeight = pageSize.second * effectiveZoom
                val centeredOffset = maxOf(PAGE_SPACING.toFloat(), (view.viewHeight - scaledHeight) / 2f)
                return centeredOffset + scaledHeight + PAGE_SPACING
            }

            var currentOffset = PAGE_SPACING.toFloat()
            for (i in 0 until pageCount) {
                val pageSize = doc.getPageSize(i) ?: continue
                val scaledHeight = pageSize.second * effectiveZoom
                currentOffset += scaledHeight + PAGE_SPACING
            }

            return currentOffset
        } catch (e: Exception) {
            Log.e(TAG, "Error calculating document height with zoom", e)
            return PAGE_SPACING.toFloat()
        }
    }

    /**
     * Gets the maximum page width from all pages in the document.
     *
     * Used for horizontal scroll constraint calculations when zoomed.
     */
    fun getMaxPageWidth(): Float {
        return try {
            context.cacheManager.withSynchronizedCache {
                val maxWidth = context.cacheManager.getMaxPageWidth()
                if (maxWidth <= 0f) {
                    view.viewWidth.toFloat()
                } else {
                    maxWidth
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting max page width", e)
            view.viewWidth.toFloat()
        }
    }

    /**
     * Gets the list of currently visible page numbers based on viewport.
     *
     * Determines which pages intersect with the current viewport, accounting
     * for zoom level and scroll position. Includes a buffer zone for smooth
     * scrolling experience.
     */
    fun getVisiblePages(): List<Int> {
        val doc = context.document
        val pageCount = doc.getPageCount()
        val visiblePages = mutableListOf<Int>()

        val viewTop = context.scrollHandler.scrollY
        val viewBottom = context.scrollHandler.scrollY + view.viewHeight
        val effectiveZoom = context.zoomAnimator.baseZoom * context.zoomAnimator.currentZoomScale

        try {
            context.cacheManager.withSynchronizedCache {
                for (i in 0 until pageCount) {
                    val pageOffset = if (context.zoomAnimator.isZooming) {
                        calculatePageOffsetRealTime(i, effectiveZoom)
                    } else {
                        context.cacheManager.getPageOffset(i) ?: continue
                    }
                    val originalPageSize = context.cacheManager.getPageSize(i) ?: continue
                    val scaledHeight = originalPageSize.second * effectiveZoom

                    val pageBottom = pageOffset + scaledHeight

                    // Check if page intersects with visible area (with buffer for smooth scrolling)
                    if (pageBottom >= viewTop - view.viewHeight && pageOffset <= viewBottom + view.viewHeight) {
                        visiblePages.add(i)
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting visible pages", e)
        }

        return visiblePages
    }

    /**
     * Determines the primary visible page number based on current scroll position.
     *
     * Uses intelligent heuristics to determine which page should be considered
     * the "current" page, with special handling for short pages and edge cases.
     */
    fun getCurrentVisiblePage(): Int {
        val doc = context.document
        val pageCount = doc.getPageCount()

        // Handle edge cases for document boundaries
        if (context.scrollHandler.scrollY <= 1f) {
            return 0 // At top of document should always be page 1
        }

        val maxScroll = maxOf(0f, context.scrollHandler.totalDocumentHeight - view.viewHeight)
        if (maxScroll > 0 && context.scrollHandler.scrollY >= maxScroll - 1f) {
            return pageCount - 1 // At bottom should show last page
        }

        val effectiveZoom = context.zoomAnimator.baseZoom * context.zoomAnimator.currentZoomScale

        context.cacheManager.withSynchronizedCache {
            val currentPageSize = context.cacheManager.getPageSize(context.documentManager.currentPage) ?: return@withSynchronizedCache 0
            val scaledPageHeight = currentPageSize.second * effectiveZoom
            val viewportHeight = view.viewHeight.toFloat()

            // Adjust detection point based on page height
            val isShortPage = scaledPageHeight < (viewportHeight * 0.5f)
            val detectionPoint = if (isShortPage) {
                context.scrollHandler.scrollY + (viewportHeight / 3f)
            } else {
                context.scrollHandler.scrollY + (viewportHeight / 2f)
            }

            // Find page containing the detection point
            for (i in 0 until pageCount) {
                val pageOffset = if (context.zoomAnimator.isZooming) {
                    calculatePageOffsetRealTime(i, effectiveZoom)
                } else {
                    context.cacheManager.getPageOffset(i) ?: continue
                }

                val pageSize = context.cacheManager.getPageSize(i) ?: continue
                val scaledHeight = pageSize.second * effectiveZoom
                val pageBottom = pageOffset + scaledHeight

                if (detectionPoint >= pageOffset && detectionPoint < pageBottom) {
                    return@withSynchronizedCache i
                }
            }
        }

        // Fallback: estimate based on scroll percentage
        return try {
            val totalHeight = if (context.zoomAnimator.currentZoomScale > MIN_ZOOM_SCALE + 0.1f) {
                calculateTotalDocumentHeightWithZoom(context.zoomAnimator.baseZoom * context.zoomAnimator.currentZoomScale)
            } else {
                context.scrollHandler.totalDocumentHeight
            }

            val scrollRatio = if (totalHeight > 0) context.scrollHandler.scrollY / totalHeight else 0f
            (scrollRatio * pageCount).toInt().coerceIn(0, pageCount - 1)
        } catch (e: Exception) {
            0
        }
    }

    /**
     * Gets estimated page bounds for visibility calculations.
     *
     * @param pageNum Page number to get bounds for
     * @return Pair of (top, bottom) coordinates, or null if invalid
     */
    fun getEstimatedPageBounds(pageNum: Int): Pair<Float, Float>? {
        return try {
            val pageCount = context.cacheManager.getPageCount()
            if (pageCount == null || pageNum < 0 || pageNum >= pageCount) return null

            context.cacheManager.withSynchronizedCache {
                val pageOffset = if (context.zoomAnimator.isZooming) {
                    calculatePageOffsetRealTime(pageNum, context.zoomAnimator.baseZoom * context.zoomAnimator.currentZoomScale)
                } else {
                    context.cacheManager.getPageOffset(pageNum) ?: return@withSynchronizedCache null
                }

                val pageSize = context.cacheManager.getPageSize(pageNum) ?: return@withSynchronizedCache null
                val effectiveZoom = context.zoomAnimator.baseZoom * context.zoomAnimator.currentZoomScale
                val scaledHeight = pageSize.second * effectiveZoom

                Pair(pageOffset, pageOffset + scaledHeight)
            }
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Pre-calculates and caches all page sizes for efficient layout operations.
     *
     * This optimization prevents repeated PDF calls during scrolling and zoom operations
     * by loading all page dimensions once during document initialization.
     */
    fun preCalculateInitialPageSizes() {
        val doc = context.document

        try {
            if (!doc.isValid()) return

            context.cacheManager.withSynchronizedCache {
                context.cacheManager.clearPageSizes()
                estimatedPageSizeSet.clear()
            }

            val pageCount = doc.getPageCount()
            for (i in 0 until minOf(DEFERRED_PAGE_SIZE_START_INDEX, pageCount)) {
                try {
                    runBlocking {
                        if (!doc.isValid() || context.isViewDestroyed()) return@runBlocking
                        doc.getPageSizeSafe(i)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error getting page size for page $i", e)
                }
            }

            context.cacheManager.withSynchronizedCache {
                val avgWidth =
                    context.cacheManager.getPageSizes().values.map { it.first }.average()
                        .toFloat()
                val avgHeight =
                    context.cacheManager.getPageSizes().values.map { it.second }.average()
                        .toFloat()

                for (i in 5 until pageCount) {
                    setEstimatedPageSize(i, Pair(avgWidth, avgHeight))
                }
            }

            Log.d(
                TAG,
                "Pre-calculated ${context.cacheManager.getPageSizes().size} page sizes"
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error pre-calculating page sizes", e)
        }
    }

    fun notifyRenderingStarted() {
        isPaused.compareAndSet(false, true)
        lastRenderTime.set(System.currentTimeMillis())
        Log.d(TAG, "Rendering Started")
    }

    fun notifyRenderingEnded() {
        isPaused.compareAndSet(true, false)
        lastRenderTime.set(System.currentTimeMillis())
        Log.d(TAG, "Rendering Ended")
        // We don't resume immediately — we wait for idle threshold in defer loop
    }

    fun stopCalculations() {
        deferredJob?.cancel()
    }

    fun launchDeferredPageSizeCalculation(scope: CoroutineScope) {
        deferredJob?.cancel()
        deferredJob = scope.launch(Dispatchers.Default) {
            delay(IDLE_THRESHOLD_MS * 2L) // start after half a second
            try {
                deferRemainingPageSizeCalculation()
            } catch (e: CancellationException) {
                Log.d(TAG, "Deferred page size calculation cancelled")
            } catch (e: Exception) {
                Log.e(TAG, "Deferred page size calculation crashed", e)
            }
        }
    }

    private fun setEstimatedPageSize(pageNum: Int, size: Pair<Float, Float>) {
        context.cacheManager.setPageSize(pageNum, size)
        estimatedPageSizeSet.add(pageNum)
    }

    private fun hasSettledSinceLastRender(): Boolean {
        val now = System.currentTimeMillis()
        return now - lastRenderTime.get() >= IDLE_THRESHOLD_MS
    }

    private suspend fun deferRemainingPageSizeCalculation() {
        if (estimatedPageSizeSet.isEmpty()) return

        val doc = context.document
        val pageCount = doc.getPageCount()
        if (DEFERRED_PAGE_SIZE_START_INDEX >= pageCount) return

        for (i in DEFERRED_PAGE_SIZE_START_INDEX until pageCount) {
            // Wait until rendering settles
            while(isPaused.get() || !hasSettledSinceLastRender()) {
                delay(RENDER_SETTLE_CHECK_DELAY)
            }

            try {
                if (!doc.isValid() || context.isViewDestroyed()) return
                // We skip checking for the cached value, but we do cache the result
                doc.getPageSizeSafe(i, true)
            } catch (e: Exception) {
                Log.w(TAG, "Error on page $i: ${e.message}")
            }

            if (i % 3 == 0) {
                delay(5)
            }
        }
        estimatedPageSizeSet.clear()
    }
}
