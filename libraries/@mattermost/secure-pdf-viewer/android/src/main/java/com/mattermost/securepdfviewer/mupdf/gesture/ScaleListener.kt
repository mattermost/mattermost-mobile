package com.mattermost.securepdfviewer.mupdf.gesture

import android.util.Log
import android.view.ScaleGestureDetector
import com.mattermost.securepdfviewer.mupdf.MuPDFView
import com.mattermost.securepdfviewer.mupdf.interaction.ZoomAnimator.Companion.MAX_ZOOM_SCALE
import com.mattermost.securepdfviewer.mupdf.interaction.ZoomAnimator.Companion.MIN_ZOOM_SCALE
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Scale gesture listener for pinch-to-zoom with focal point preservation.
 *
 * Implements smooth pinch-to-zoom with real-time focal point calculation
 * to keep the pinched area centered under the user's fingers throughout
 * the scaling operation.
 */
internal class ScaleListener(
    private val view: MuPDFView
) : ScaleGestureDetector.SimpleOnScaleGestureListener() {

    companion object {
        private const val TAG = "ScaleListener"
    }

    private var focusDocX = 0f
    private var focusDocY = 0f
    private var focusLayoutY = 0f
    private var startPageNum: Int? = null

    override fun onScaleBegin(detector: ScaleGestureDetector): Boolean {
        view.scroller.forceFinished(true)
        view.scrollGestureListener.stopCustomFlinging()

        // Ensure layout offsets are up-to-date with current zoom and scroll
        view.layoutCalculator.updateDocumentLayout()

        val baseScale = view.zoomAnimator.baseZoom * view.zoomAnimator.currentZoomScale

        // Get the correct page based on current scroll
        startPageNum = view.coordinateConverter.getPageAtScreenCoordinates(detector.focusX, detector.focusY) ?: 0
        val pageOffsetY = view.pageOffsets[startPageNum] ?: 0f

        val pageSize = view.pageSizes[startPageNum] ?: return false
        val scaledWidth = pageSize.first * baseScale
        val scaledHeight = pageSize.second * baseScale
        val pageLeft = (view.width - scaledWidth) / 2f

        // Calculate relative position within the page for focal point preservation
        val relativeX = ((detector.focusX + view.scrollHandler.scrollX - pageLeft) / scaledWidth).coerceIn(0f, 1f)
        val relativeY = ((detector.focusY + view.scrollHandler.scrollY - pageOffsetY) / scaledHeight).coerceIn(0f, 1f)

        focusDocX = relativeX * pageSize.first
        focusDocY = relativeY * pageSize.second
        focusLayoutY = pageOffsetY

        return true
    }

    override fun onScale(detector: ScaleGestureDetector): Boolean {
        val scaleFactor = detector.scaleFactor
        val newScale = (view.zoomAnimator.currentZoomScale * scaleFactor).coerceIn(MIN_ZOOM_SCALE, MAX_ZOOM_SCALE)

        if (kotlin.math.abs(newScale - view.zoomAnimator.currentZoomScale) < 0.001f) {
            return true
        }

        view.zoomAnimator.currentZoomScale = newScale
        val baseScale = view.zoomAnimator.baseZoom * view.zoomAnimator.currentZoomScale

        // Recalculate layout at new scale
        view.layoutCalculator.updateDocumentLayout()

        val pageOffsetY = view.pageOffsets[startPageNum] ?: focusLayoutY
        val pageSize = view.pageSizes[startPageNum] ?: return false
        val scaledWidth = pageSize.first * baseScale
        val scaledHeight = pageSize.second * baseScale
        val pageLeft = (view.width - scaledWidth) / 2f

        // Calculate new scroll position to maintain focal point
        val targetX = pageLeft + (focusDocX / pageSize.first) * scaledWidth
        val targetY = pageOffsetY + (focusDocY / pageSize.second) * scaledHeight

        view.scrollHandler.scrollX = targetX - detector.focusX
        view.scrollHandler.scrollY = targetY - detector.focusY

        // Apply constraints
        view.scrollHandler.constrainHorizontalScroll()
        val maxScrollY = maxOf(0f, view.scrollHandler.totalDocumentHeight - view.height)
        view.scrollHandler.scrollY = view.scrollHandler.scrollY.coerceIn(0f, maxScrollY)

        // Update scroll handle periodically during pinch
        if (System.currentTimeMillis() % 10 == 0L) {
            view.scrollHandler.updateScrollHandleImmediate()
        }

        view.invalidate()
        return true
    }

    override fun onScaleEnd(detector: ScaleGestureDetector) {
        view.layoutCalculator.updateDocumentLayout()
        view.scrollHandler.updateScrollHandleAfterZoom()

        // Clear and re-render pages at new zoom level
        view.viewScope.launch {
            delay(50)
            view.pageCacheManager.clearAndRerenderPages()
        }
        startPageNum = null
        Log.d(TAG, "Scale ended at zoom: ${view.zoomAnimator.currentZoomScale}")
    }
}
