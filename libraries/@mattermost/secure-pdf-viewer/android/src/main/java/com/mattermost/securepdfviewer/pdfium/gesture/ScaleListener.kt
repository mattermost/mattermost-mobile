package com.mattermost.securepdfviewer.pdfium.gesture

import android.util.Log
import android.view.ScaleGestureDetector
import com.mattermost.securepdfviewer.pdfium.interaction.ZoomAnimator.Companion.MAX_ZOOM_SCALE
import com.mattermost.securepdfviewer.pdfium.interaction.ZoomAnimator.Companion.MIN_ZOOM_SCALE
import com.mattermost.securepdfviewer.pdfium.shared.PdfContext
import com.mattermost.securepdfviewer.pdfium.shared.PdfViewInterface
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Scale gesture listener for pinch-to-zoom with focal point preservation.
 *
 * Implements smooth pinch-to-zoom with real-time focal point calculation
 * to keep the pinched area centered under the user's fingers throughout
 * the scaling operation.
 */
class ScaleListener(
    private val context: PdfContext,
    private val view: PdfViewInterface
) : ScaleGestureDetector.SimpleOnScaleGestureListener() {

    companion object {
        private const val TAG = "ScaleListener"
    }

    private var focusDocX = 0f
    private var focusDocY = 0f
    private var focusLayoutY = 0f
    private var startPageNum: Int? = null

    override fun onScaleBegin(detector: ScaleGestureDetector): Boolean {
        context.scroller.forceFinished(true)
        context.scrollGestureListener.stopCustomFlinging()

        // Ensure layout offsets are up-to-date with current zoom and scroll
        context.layoutCalculator.updateDocumentLayout()

        val baseScale = context.zoomAnimator.baseZoom * context.zoomAnimator.currentZoomScale

        // Get the correct page based on current scroll
        startPageNum = context.coordinateConverter.getPageAtScreenCoordinates(detector.focusX, detector.focusY) ?: 0
        val pageOffsetY = context.cacheManager.getPageOffset(startPageNum!!) ?: 0f

        val pageSize = context.cacheManager.getPageSize(startPageNum!!) ?: return false
        val scaledWidth = pageSize.first * baseScale
        val scaledHeight = pageSize.second * baseScale
        val pageLeft = (view.viewWidth - scaledWidth) / 2f

        // Calculate relative position within the page for focal point preservation
        val relativeX = ((detector.focusX + context.scrollHandler.scrollX - pageLeft) / scaledWidth).coerceIn(0f, 1f)
        val relativeY = ((detector.focusY + context.scrollHandler.scrollY - pageOffsetY) / scaledHeight).coerceIn(0f, 1f)

        focusDocX = relativeX * pageSize.first
        focusDocY = relativeY * pageSize.second
        focusLayoutY = pageOffsetY

        return true
    }

    override fun onScale(detector: ScaleGestureDetector): Boolean {
        val scaleFactor = detector.scaleFactor
        val newScale = (context.zoomAnimator.currentZoomScale * scaleFactor).coerceIn(MIN_ZOOM_SCALE, MAX_ZOOM_SCALE)

        if (kotlin.math.abs(newScale - context.zoomAnimator.currentZoomScale) < 0.001f) {
            return true
        }

        context.zoomAnimator.currentZoomScale = newScale
        val baseScale = context.zoomAnimator.baseZoom * context.zoomAnimator.currentZoomScale

        // Recalculate layout at new scale
        context.layoutCalculator.updateDocumentLayout()

        val pageOffsetY = context.cacheManager.getPageOffset(startPageNum!!) ?: focusLayoutY
        val pageSize = context.cacheManager.getPageSize(startPageNum!!) ?: return false
        val scaledWidth = pageSize.first * baseScale
        val scaledHeight = pageSize.second * baseScale
        val pageLeft = (view.viewWidth - scaledWidth) / 2f

        // Calculate new scroll position to maintain focal point
        val targetX = pageLeft + (focusDocX / pageSize.first) * scaledWidth
        val targetY = pageOffsetY + (focusDocY / pageSize.second) * scaledHeight

        context.scrollHandler.scrollX = targetX - detector.focusX
        context.scrollHandler.scrollY = targetY - detector.focusY

        // Apply constraints
        context.scrollHandler.constrainHorizontalScroll()
        val maxScrollY = maxOf(0f, context.scrollHandler.totalDocumentHeight - view.viewHeight)
        context.scrollHandler.scrollY = context.scrollHandler.scrollY.coerceIn(0f, maxScrollY)

        // Update scroll handle periodically during pinch
        if (System.currentTimeMillis() % 10 == 0L) {
            context.scrollHandler.updateScrollHandleImmediate()
        }

        view.invalidate()
        return true
    }

    override fun onScaleEnd(detector: ScaleGestureDetector) {
        context.layoutCalculator.updateDocumentLayout()
        context.scrollHandler.updateScrollHandleAfterZoom()

        // Clear and re-render pages at new zoom level
        context.viewScope.launch {
            delay(50)
            context.renderManager.clearAndRerenderPages()
        }
        startPageNum = null
        Log.d(TAG, "Scale ended at zoom: ${context.zoomAnimator.currentZoomScale}")
    }
}
