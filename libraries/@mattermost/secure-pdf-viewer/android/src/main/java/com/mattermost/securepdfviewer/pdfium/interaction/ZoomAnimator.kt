package com.mattermost.securepdfviewer.pdfium.interaction

import android.util.Log
import com.mattermost.securepdfviewer.pdfium.PdfView.Companion.PAGE_SPACING
import com.mattermost.securepdfviewer.pdfium.shared.PdfContext
import com.mattermost.securepdfviewer.pdfium.shared.PdfViewInterface
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class ZoomAnimator(private val context: PdfContext, private val view: PdfViewInterface) {
    companion object {
        private const val TAG = "ZoomAnimator"

        // Zoom constants
        const val MIN_ZOOM_SCALE = 1.0f
        const val MAX_ZOOM_SCALE = 3.0f
        private const val ZOOM_ANIMATION_DURATION = 300
    }

    /**
     * Base zoom level required to fit page width to screen width.
     */
    var baseZoom = 1.0f
        internal set

    /**
     * Current zoom scale factor (1.0 = fit-to-width, 3.0 = maximum zoom).
     */
    var currentZoomScale = MIN_ZOOM_SCALE
        internal set

    /**
     * Flag indicating if zoom animation is currently in progress.
     */
    var isZooming = false
        private set

    // Animation state
    private var zoomStartTime = 0L
    private var zoomStartScale = MIN_ZOOM_SCALE
    private var zoomTargetScale = MIN_ZOOM_SCALE
    private var zoomStartScrollY = 0f
    private var zoomStartScrollX = 0f
    private var zoomTargetScrollY = 0f
    private var zoomTargetScrollX = 0f

    /**
     * Calculates the base zoom level required to fit page width to screen width.
     *
     * This zoom level serves as the foundation for all scaling operations,
     * ensuring pages are properly sized for the current device screen.
     */
    fun calculateBaseZoom() {
        val doc = context.document
        if (!doc.isValid() || view.viewWidth <= 0) {
            Log.d(TAG,"Cannot calculate zoom: doc=${doc.isValid()}, width=${view.viewWidth}")
            return
        }

        try {
            val pageSize = doc.getPageSize(0)
            if (pageSize == null) {
                Log.e(TAG, "Could not get page 0 size")
                baseZoom = 1.0f
                return
            }

            val availableWidth = view.viewWidth - (PAGE_SPACING * 2)
            baseZoom = availableWidth / pageSize.first
            Log.d(TAG, "Calculated base zoom: $baseZoom (page: ${pageSize.first}x${pageSize.second}, view: ${view.viewWidth}x${view.viewHeight})")
        } catch (e: Exception) {
            Log.e(TAG, "Error calculating zoom", e)
            baseZoom = 1.0f
        }
    }

    /**
     * Handles double tap zoom toggle with focal point preservation.
     *
     * Implements intelligent zoom toggling between fit-width and 2x zoom,
     * with precise focal point calculation to keep the tapped area centered
     * during the zoom transition.
     *
     * @param focusX X coordinate of the double tap
     * @param focusY Y coordinate of the double tap
     */
    fun handleDoubleTapZoom(focusX: Float, focusY: Float) {
        try {
            // Stop any ongoing animations
            context.scroller.forceFinished(true)
            context.scrollGestureListener.stopCustomFlinging()

            // Determine target zoom level
            val targetScale = if (currentZoomScale > MIN_ZOOM_SCALE + 0.1f) {
                MIN_ZOOM_SCALE // Zoom out to fit width
            } else {
                2.0f // Zoom in
            }

            if (kotlin.math.abs(targetScale - currentZoomScale) < 0.1f) {
                Log.d(TAG, "Already at target zoom level")
                return
            }

            context.layoutCalculator.updateDocumentLayout()

            val baseScale = baseZoom * currentZoomScale

            // Get the specific page that was tapped
            val tappedPageNum = context.coordinateConverter.getPageAtScreenCoordinates(focusX, focusY) ?: 0
            val pageOffsetY = context.cacheManager.getPageOffset(tappedPageNum) ?: 0f

            val pageSize = context.cacheManager.getPageSize(tappedPageNum) ?: return
            val scaledWidth = pageSize.first * baseScale
            val scaledHeight = pageSize.second * baseScale
            val pageLeft = (view.viewWidth - scaledWidth) / 2f

            // Calculate relative position within the tapped page
            val relativeX = ((focusX + context.scrollHandler.scrollX - pageLeft) / scaledWidth).coerceIn(0f, 1f)
            val relativeY = ((focusY + context.scrollHandler.scrollY - pageOffsetY) / scaledHeight).coerceIn(0f, 1f)

            val focusDocX = relativeX * pageSize.first
            val focusDocY = relativeY * pageSize.second

            // Calculate target scroll position
            val tempCurrentZoom = currentZoomScale
            currentZoomScale = targetScale
            val newBaseScale = baseZoom * currentZoomScale

            // Temporarily update layout to calculate target position
            context.layoutCalculator.updateDocumentLayout()

            val newPageOffsetY = context.cacheManager.getPageOffset(tappedPageNum) ?: 0f
            val newScaledWidth = pageSize.first * newBaseScale
            val newScaledHeight = pageSize.second * newBaseScale
            val newPageLeft = (view.viewWidth - newScaledWidth) / 2f

            // Calculate where the focal point should be
            val targetX = newPageLeft + (focusDocX / pageSize.first) * newScaledWidth
            val targetY = newPageOffsetY + (focusDocY / pageSize.second) * newScaledHeight

            val targetScrollX = targetX - focusX
            val targetScrollY = targetY - focusY

            // Restore original zoom and layout for animation
            currentZoomScale = tempCurrentZoom
            context.layoutCalculator.updateDocumentLayout()

            // Constrain target scroll position
            val tempZoom = currentZoomScale
            currentZoomScale = targetScale
            context.layoutCalculator.updateDocumentLayout()
            val maxScrollY = maxOf(0f, context.scrollHandler.totalDocumentHeight - view.viewHeight)
            val constrainedTargetScrollY = targetScrollY.coerceIn(0f, maxScrollY)

            // Constrain horizontal scroll
            val constrainedTargetScrollX = if (targetScale > MIN_ZOOM_SCALE) {
                val maxPageWidth = context.layoutCalculator.getMaxPageWidth()
                val effectiveZoom = baseZoom * targetScale
                val scaledZoomedWidth = maxPageWidth * effectiveZoom
                val overflowWidth = scaledZoomedWidth - view.viewWidth
                val maxHorizontalScroll = if (overflowWidth > 0f) overflowWidth / 2f else 0f
                targetScrollX.coerceIn(-maxHorizontalScroll, maxHorizontalScroll)
            } else {
                0f
            }

            // Restore for animation
            currentZoomScale = tempZoom
            context.layoutCalculator.updateDocumentLayout()

            // Start smooth animation to calculated target
            startZoomAnimation(targetScale, constrainedTargetScrollY, constrainedTargetScrollX)

            Log.d(TAG, "Double tap zoom: $currentZoomScale -> $targetScale")
            Log.d(TAG, "Page $tappedPageNum, relative pos: ($relativeX, $relativeY)")
            Log.d(TAG, "Target scroll: ($constrainedTargetScrollX, $constrainedTargetScrollY)")

        } catch (e: Exception) {
            Log.e(TAG, "Error handling double tap zoom", e)
        }
    }

    /**
     * Updates zoom animation state and applies interpolated values.
     *
     * Uses ease-out interpolation for natural animation feel and applies
     * real-time constraints to prevent scrolling beyond document bounds.
     *
     * @return true if animation should continue, false if complete
     */
    fun updateZoomAnimation(): Boolean {
        if (!isZooming) return false

        try {
            val currentTime = System.currentTimeMillis()
            val elapsed = (currentTime - zoomStartTime).toFloat()
            val progress = (elapsed / ZOOM_ANIMATION_DURATION).coerceIn(0f, 1f)

            // Use ease-out interpolation for smooth animation
            val interpolatedProgress = 1f - (1f - progress) * (1f - progress)

            // Calculate current values
            val newScale = zoomStartScale + (zoomTargetScale - zoomStartScale) * interpolatedProgress
            val newScrollY = zoomStartScrollY + (zoomTargetScrollY - zoomStartScrollY) * interpolatedProgress
            val newScrollX = zoomStartScrollX + (zoomTargetScrollX - zoomStartScrollX) * interpolatedProgress

            // Apply new values
            currentZoomScale = newScale
            context.scrollHandler.scrollX = newScrollX
            context.scrollHandler.scrollY = newScrollY

            // Apply real-time constraints
            val maxScrollY = maxOf(0f, context.scrollHandler.totalDocumentHeight - view.viewHeight)
            context.scrollHandler.scrollY = context.scrollHandler.scrollY.coerceIn(0f, maxScrollY)

            if (currentZoomScale > MIN_ZOOM_SCALE + 0.1f) {
                val maxPageWidth = context.layoutCalculator.getMaxPageWidth()
                val currentEffectiveZoom = baseZoom * currentZoomScale
                val scaledContentWidth = maxPageWidth * currentEffectiveZoom
                val overflowWidth = scaledContentWidth - view.viewWidth
                val maxHorizontalScroll = if (overflowWidth > 0f) overflowWidth / 2f else 0f
                context.scrollHandler.scrollX = context.scrollHandler.scrollX.coerceIn(-maxHorizontalScroll, maxHorizontalScroll)
            } else {
                context.scrollHandler.scrollX = 0f
            }

            context.layoutCalculator.updateDocumentLayout()

            // Update scroll handle periodically during animation
            if (System.currentTimeMillis() % 3 == 0L) {
                context.scrollHandler.updateScrollHandleImmediate()
            }

            // Check if animation is complete
            if (progress >= 1f) {
                isZooming = false
                currentZoomScale = zoomTargetScale

                context.layoutCalculator.updateDocumentLayout()
                context.scrollHandler.updateScrollHandleAfterZoom()

                context.viewScope.launch {
                    delay(100)
                    context.renderManager.clearAndRerenderPages()
                }

                Log.d(TAG, "Zoom animation completed at scale: $currentZoomScale")
                return false
            }

            return true
        } catch (e: Exception) {
            Log.e(TAG, "Error updating zoom animation", e)
            isZooming = false
            return false
        }
    }

    /**
     * Resets zoom state to initial values.
     */
    fun reset() {
        currentZoomScale = MIN_ZOOM_SCALE
        isZooming = false
        baseZoom = 1.0f

        // Reset animation state
        zoomStartTime = 0L
        zoomStartScale = MIN_ZOOM_SCALE
        zoomTargetScale = MIN_ZOOM_SCALE
        zoomStartScrollY = 0f
        zoomStartScrollX = 0f
        zoomTargetScrollY = 0f
        zoomTargetScrollX = 0f
    }

    /**
     * Smoothly animates zoom back to base level and waits until it completes.
     */
    suspend fun zoomToBase() {
        if (currentZoomScale <= MIN_ZOOM_SCALE + 0.01f) return

        val latch = CompletableDeferred<Unit>()

        startZoomAnimation(
            targetScale = MIN_ZOOM_SCALE,
            targetScrollY = 0f, // or maintain scroll position if needed
            targetScrollX = 0f
        )

        // Wait until zoom finishes
        while (isZooming) {
            delay(16)
        }

        latch.complete(Unit)
    }


    // Private methods

    /**
     * Starts a smooth zoom animation to the calculated target state.
     *
     * @param targetScale Target zoom scale
     * @param targetScrollY Target vertical scroll position
     * @param targetScrollX Target horizontal scroll position
     */
    private fun startZoomAnimation(
        targetScale: Float,
        targetScrollY: Float,
        targetScrollX: Float,
    ) {
        isZooming = true
        zoomStartTime = System.currentTimeMillis()
        zoomStartScale = currentZoomScale
        zoomTargetScale = targetScale
        zoomStartScrollY = context.scrollHandler.scrollY
        zoomTargetScrollY = targetScrollY
        zoomStartScrollX = context.scrollHandler.scrollX
        zoomTargetScrollX = targetScrollX

        view.invalidate()
    }
}
