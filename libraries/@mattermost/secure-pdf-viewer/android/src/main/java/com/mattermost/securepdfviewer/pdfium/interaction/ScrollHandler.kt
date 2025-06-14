package com.mattermost.securepdfviewer.pdfium.interaction

import android.util.Log
import com.mattermost.securepdfviewer.pdfium.interaction.ZoomAnimator.Companion.MIN_ZOOM_SCALE
import com.mattermost.securepdfviewer.pdfium.shared.PdfContext
import com.mattermost.securepdfviewer.pdfium.shared.PdfViewInterface
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Handles all scrolling operations, constraints, and scroll handle integration for the PDF viewer.
 *
 * This class manages:
 * - Scroll animation with custom fling implementation and zoom animation
 * - Scroll constraint system for horizontal and vertical bounds
 * - Scroll handle integration with smooth tracking during user interaction
 * - Page change detection and current page tracking
 * - Scroll position calculations and conversions
 *
 * The handler orchestrates multiple animation systems and provides smooth scrolling
 * experience while maintaining proper integration with zoom and layout systems.
 */
class ScrollHandler(private val context: PdfContext, private val view: PdfViewInterface) {

    companion object {
        private const val TAG = "ScrollHandler"
    }

    // Scroll State

    var scrollY = 0f
        internal set

    var scrollX = 0f
        internal set

    var totalDocumentHeight = 0f
        internal set

    // Scroll Animation System

    /**
     * Handles scroll animation with custom fling implementation and zoom animation.
     *
     * Orchestrates multiple animation systems:
     * - Zoom animations with smooth interpolation
     * - Standard Android scroller for smooth scrolling
     * - Custom fling implementation for consistent behavior
     * - Scroll handle updates during all animation types
     */
    fun computeScroll() {
        var shouldInvalidate = false
        var scrollChanged = false

        // Handle zoom animation first
        if (context.zoomAnimator.updateZoomAnimation()) {
            shouldInvalidate = true
        }

        // Handle standard scroller (for non-fling animations) - only if not zooming
        if (context.scroller.computeScrollOffset() && !context.scrollGestureListener.isCustomFlinging && !context.zoomAnimator.isZooming) {
            if (context.zoomAnimator.currentZoomScale > MIN_ZOOM_SCALE + 0.1f) {
                val newScrollX = context.scroller.currX.toFloat()
                scrollX = newScrollX
                constrainHorizontalScroll()
            } else {
                scrollY = context.scroller.currY.toFloat()
                val maxScroll = maxOf(0f, totalDocumentHeight - view.viewHeight)
                scrollY = scrollY.coerceIn(0f, maxScroll)
            }
            shouldInvalidate = true
            scrollChanged = true
        }

        // Handle custom fling - only if not zooming
        if (context.scrollGestureListener.isCustomFlinging && !context.zoomAnimator.isZooming) {
            val currentTime = System.currentTimeMillis()
            val elapsedTime = (currentTime - context.scrollGestureListener.flingStartTime) / 1000f // Convert to seconds

            // Calculate current velocity: v = v0 - at
            val currentVelocity = context.scrollGestureListener.flingVelocity - (context.scrollGestureListener.flingDeceleration * elapsedTime * kotlin.math.sign(context.scrollGestureListener.flingVelocity))

            // Stop if velocity has reversed or is too small
            if (currentVelocity * context.scrollGestureListener.flingVelocity <= 0 || kotlin.math.abs(currentVelocity) < 50) {
                context.scrollGestureListener.stopCustomFlinging()
                Log.d(TAG, "Custom fling finished")
            } else {
                val newScrollY = scrollY + (currentVelocity * 0.016f) // Approximate frame time

                val maxScroll = maxOf(0f, totalDocumentHeight - view.viewHeight)
                val constrainedScrollY = newScrollY.coerceIn(0f, maxScroll)

                // Stop fling immediately if we hit a boundary
                if (constrainedScrollY != newScrollY) {
                    context.scrollGestureListener.stopCustomFlinging()
                    Log.d(TAG, "Custom fling stopped at boundary")
                }

                scrollY = constrainedScrollY
                shouldInvalidate = true
                scrollChanged = true
            }
        }

        if (shouldInvalidate) {
            if (scrollChanged) {
                updateScrollHandleImmediate()
            }

            view.invalidate()
        }
    }

    // Scroll Constraint system

    /**
     * Constrains horizontal scroll to valid bounds when zoomed.
     *
     * Prevents horizontal panning beyond page edges while allowing
     * full page content to be accessible through panning gestures.
     */
    fun constrainHorizontalScroll() {
        if (context.zoomAnimator.currentZoomScale <= MIN_ZOOM_SCALE + 0.1f) {
            scrollX = 0f
            return
        }

        try {
            val maxPageWidth = context.layoutCalculator.getMaxPageWidth()
            if (maxPageWidth <= 0f) return

            val effectiveZoom = context.zoomAnimator.baseZoom * context.zoomAnimator.currentZoomScale
            val scaledContentWidth = maxPageWidth * effectiveZoom

            // Calculate how much of the page extends beyond the screen
            val overflowWidth = scaledContentWidth - view.viewWidth

            if (overflowWidth <= 0f) {
                // Page fits within screen width, center it
                scrollX = 0f
            } else {
                // Allow scrolling to show the overflow content
                val maxHorizontalScroll = overflowWidth / 2f
                scrollX = scrollX.coerceIn(-maxHorizontalScroll, maxHorizontalScroll)
            }

        } catch (e: Exception) {
            Log.e(TAG, "Error constraining horizontal scroll", e)
            scrollX = 0f
        }
    }

    // Scroll handle integration

    /**
     * Gets the current scroll percentage for scroll handle positioning.
     *
     * @return Current scroll position as percentage (0.0 to 1.0)
     */
    private fun getCurrentScrollPercentage(): Float {
        return try {
            val currentDocHeight = if (context.zoomAnimator.currentZoomScale > MIN_ZOOM_SCALE + 0.1f) {
                context.layoutCalculator.calculateTotalDocumentHeightWithZoom(context.zoomAnimator.baseZoom * context.zoomAnimator.currentZoomScale)
            } else {
                totalDocumentHeight
            }

            val maxScroll = maxOf(0f, currentDocHeight - view.viewHeight)
            if (maxScroll > 0) scrollY / maxScroll else 0f
        } catch (e: Exception) {
            0f
        }
    }

    /**
     * Updates scroll handle immediately for smooth tracking during user interaction.
     */
    fun updateScrollHandleImmediate() {
        try {
            val currentPageNum = context.layoutCalculator.getCurrentVisiblePage()
            val scrollPercentage = getCurrentScrollPercentage()

            context.documentManager.currentPage = currentPageNum
            context.onPageChanged?.invoke(currentPageNum)
            context.onScrollChanged?.invoke(scrollPercentage)
        } catch (e: Exception) {
            Log.e(TAG, "Error updating scroll handle", e)
        }
    }

    /**
     * Updates scroll handle with delay for zoom operations to let layout settle.
     */
    fun updateScrollHandleAfterZoom() {
        context.viewScope.launch {
            delay(100) // Allow layout to settle after zoom
            updateScrollHandleImmediate()
        }
    }

    // Scroll management

    /**
     * Resets scroll state to initial values.
     */
    fun reset() {
        scrollY = 0f
        scrollX = 0f
        totalDocumentHeight = 0f
    }
}
