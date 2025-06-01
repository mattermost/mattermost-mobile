package com.mattermost.securepdfviewer.mupdf.layout

import android.util.Log
import com.mattermost.securepdfviewer.mupdf.MuPDFView
import com.mattermost.securepdfviewer.mupdf.MuPDFView.Companion.PAGE_SPACING
import com.mattermost.securepdfviewer.mupdf.interaction.ZoomAnimator.Companion.MIN_ZOOM_SCALE

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
internal class LayoutCalculator(private val view: MuPDFView) {

    companion object {
        private const val TAG = "LayoutCalculator"
    }

    /**
     * Updates the document layout based on current zoom scale.
     *
     * Recalculates page positions and total document height when zoom changes,
     * with special handling for single-page documents which are vertically centered.
     */
    fun updateDocumentLayout() {
        val doc = view.document ?: return

        try {
            val pageCount = doc.getPageCount()
            var currentOffset = PAGE_SPACING.toFloat()
            val effectiveZoom = view.zoomAnimator.baseZoom * view.zoomAnimator.currentZoomScale

            synchronized(view.cacheAccessLock) {
                view.pageOffsets.clear()

                if (pageCount == 1) {
                    val pageSize = view.pageSizes[0]
                    if (pageSize != null) {
                        val scaledHeight = pageSize.second * effectiveZoom
                        // Center single pages vertically for better presentation
                        val centeredOffset = maxOf(PAGE_SPACING.toFloat(), (view.height - scaledHeight) / 2f)
                        view.pageOffsets[0] = centeredOffset
                        view.scrollHandler.totalDocumentHeight = centeredOffset + scaledHeight + PAGE_SPACING
                    }
                } else {
                    // Multi-page documents use sequential layout
                    for (i in 0 until pageCount) {
                        val originalPageSize = view.pageSizes[i]
                        if (originalPageSize == null) {
                            Log.w(TAG, "No page size for page $i during layout update")
                            continue
                        }

                        view.pageOffsets[i] = currentOffset

                        val scaledHeight = originalPageSize.second * effectiveZoom
                        currentOffset += scaledHeight + PAGE_SPACING
                    }

                    view.scrollHandler.totalDocumentHeight = currentOffset
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
        val doc = view.document ?: return 0f
        val pageCount = doc.getPageCount()

        try {
            // Special handling for single-page documents
            if (pageCount == 1 && pageNum == 0) {
                val pageSize = doc.getPageSize(0) ?: return PAGE_SPACING.toFloat()
                val scaledHeight = pageSize.second * effectiveZoom
                return maxOf(PAGE_SPACING.toFloat(), (view.height - scaledHeight) / 2f)
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
        val doc = view.document ?: return 0f
        val pageCount = doc.getPageCount()

        try {
            if (pageCount == 1) {
                val pageSize = doc.getPageSize(0) ?: return PAGE_SPACING.toFloat() * 2
                val scaledHeight = pageSize.second * effectiveZoom
                val centeredOffset = maxOf(PAGE_SPACING.toFloat(), (view.height - scaledHeight) / 2f)
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
            synchronized(view.cacheAccessLock) {
                val maxWidth = view.pageSizes.values.maxOfOrNull { it.first } ?: 0f
                if (maxWidth <= 0f) {
                    view.width.toFloat()
                } else {
                    maxWidth
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting max page width", e)
            view.width.toFloat()
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
        val doc = view.document ?: return emptyList()
        val pageCount = doc.getPageCount()
        val visiblePages = mutableListOf<Int>()

        val viewTop = view.scrollHandler.scrollY
        val viewBottom = view.scrollHandler.scrollY + view.height
        val effectiveZoom = view.zoomAnimator.baseZoom * view.zoomAnimator.currentZoomScale

        try {
            synchronized(view.cacheAccessLock) {
                for (i in 0 until pageCount) {
                    val pageOffset = if (view.zoomAnimator.isZooming) {
                        calculatePageOffsetRealTime(i, effectiveZoom)
                    } else {
                        view.pageOffsets[i] ?: continue
                    }
                    val originalPageSize = view.pageSizes[i] ?: continue
                    val scaledHeight = originalPageSize.second * effectiveZoom

                    val pageBottom = pageOffset + scaledHeight

                    // Check if page intersects with visible area (with buffer for smooth scrolling)
                    if (pageBottom >= viewTop - view.height && pageOffset <= viewBottom + view.height) {
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
        val doc = view.document ?: return 0
        val pageCount = doc.getPageCount()

        // Handle edge cases for document boundaries
        if (view.scrollHandler.scrollY <= 1f) {
            return 0 // At top of document should always be page 1
        }

        val maxScroll = maxOf(0f, view.scrollHandler.totalDocumentHeight - view.height)
        if (maxScroll > 0 && view.scrollHandler.scrollY >= maxScroll - 1f) {
            return pageCount - 1 // At bottom should show last page
        }

        val effectiveZoom = view.zoomAnimator.baseZoom * view.zoomAnimator.currentZoomScale

        synchronized(view.cacheAccessLock) {
            val currentPageSize = view.pageSizes[view.currentPage] ?: return 0
            val scaledPageHeight = currentPageSize.second * effectiveZoom
            val viewportHeight = view.height.toFloat()

            // Adjust detection point based on page height
            val isShortPage = scaledPageHeight < (viewportHeight * 0.5f)
            val detectionPoint = if (isShortPage) {
                view.scrollHandler.scrollY + (viewportHeight / 3f)
            } else {
                view.scrollHandler.scrollY + (viewportHeight / 2f)
            }

            // Find page containing the detection point
            for (i in 0 until pageCount) {
                val pageOffset = if (view.zoomAnimator.isZooming) {
                    calculatePageOffsetRealTime(i, effectiveZoom)
                } else {
                    view.pageOffsets[i] ?: continue
                }

                val pageSize = view.pageSizes[i] ?: continue
                val scaledHeight = pageSize.second * effectiveZoom
                val pageBottom = pageOffset + scaledHeight

                if (detectionPoint >= pageOffset && detectionPoint < pageBottom) {
                    return i
                }
            }
        }

        // Fallback: estimate based on scroll percentage
        return try {
            val totalHeight = if (view.zoomAnimator.currentZoomScale > MIN_ZOOM_SCALE + 0.1f) {
                calculateTotalDocumentHeightWithZoom(view.zoomAnimator.baseZoom * view.zoomAnimator.currentZoomScale)
            } else {
                view.scrollHandler.totalDocumentHeight
            }

            val scrollRatio = if (totalHeight > 0) view.scrollHandler.scrollY / totalHeight else 0f
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
            val pageCount = view.getPageCount()
            if (pageNum < 0 || pageNum >= pageCount) return null

            synchronized(view.cacheAccessLock) {
                val pageOffset = if (view.zoomAnimator.isZooming) {
                    calculatePageOffsetRealTime(pageNum, view.zoomAnimator.baseZoom * view.zoomAnimator.currentZoomScale)
                } else {
                    view.pageOffsets[pageNum] ?: return null
                }

                val pageSize = view.pageSizes[pageNum] ?: return null
                val effectiveZoom = view.zoomAnimator.baseZoom * view.zoomAnimator.currentZoomScale
                val scaledHeight = pageSize.second * effectiveZoom

                Pair(pageOffset, pageOffset + scaledHeight)
            }
        } catch (e: Exception) {
            null
        }
    }
}
