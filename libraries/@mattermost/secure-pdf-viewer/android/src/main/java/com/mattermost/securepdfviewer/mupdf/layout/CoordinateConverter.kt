package com.mattermost.securepdfviewer.mupdf.layout

import android.graphics.PointF
import android.util.Log
import com.mattermost.securepdfviewer.mupdf.MuPDFView

/**
 * Utility class for converting coordinates between different coordinate systems in the PDF viewer.
 *
 * Handles conversions between:
 * - Screen coordinates (relative to the view)
 * - Page coordinates (relative to individual PDF pages)
 * - Document coordinates (relative to the entire document layout)
 *
 * Accounts for scroll position, zoom level, and page centering to accurately
 * map coordinates between the different coordinate spaces used throughout the viewer.
 */
internal class CoordinateConverter(private val view: MuPDFView) {

    companion object {
        private const val TAG = "CoordinateConverter"
    }

    /**
     * Converts screen coordinates to page coordinates for link detection.
     *
     * Accounts for scroll position, zoom level, and page centering to accurately
     * map touch coordinates to positions within the PDF page coordinate system.
     *
     * @param screenX X coordinate on screen
     * @param screenY Y coordinate on screen (relative to view)
     * @param pageNum Page number to convert coordinates for
     * @return Point in page coordinate space, or null if conversion fails
     */
    fun screenToPageCoordinates(screenX: Float, screenY: Float, pageNum: Int): PointF? {
        return try {
            synchronized(view.cacheAccessLock) {
                val pageOffset = view.pageOffsets[pageNum] ?: return null
                val originalPageSize = view.pageSizes[pageNum] ?: return null

                val effectiveZoom = view.zoomAnimator.baseZoom * view.zoomAnimator.currentZoomScale
                val scaledWidth = originalPageSize.first * effectiveZoom
                val scaledHeight = originalPageSize.second * effectiveZoom
                val pageLeft = (view.width - scaledWidth) / 2f

                // Check if coordinates are within page bounds
                if (screenX < pageLeft - view.scrollHandler.scrollX || screenX > pageLeft + scaledWidth - view.scrollHandler.scrollX ||
                    screenY < pageOffset - view.scrollHandler.scrollY || screenY > pageOffset + scaledHeight - view.scrollHandler.scrollY) {
                    return null
                }

                // Convert to relative coordinates within the page
                val relativeX = (screenX - (pageLeft - view.scrollHandler.scrollX)) / scaledWidth
                val relativeY = (screenY - (pageOffset - view.scrollHandler.scrollY)) / scaledHeight

                // Convert to actual page coordinates
                val pageX = originalPageSize.first * relativeX
                val pageY = originalPageSize.second * relativeY

                PointF(pageX, pageY)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error converting screen coordinates to page coordinates", e)
            null
        }
    }

    /**
     * Finds which page contains the given screen coordinates.
     *
     * @param screenX X coordinate on screen
     * @param screenY Y coordinate on screen (relative to view)
     * @return Page number, or null if no page contains the point
     */
    fun getPageAtScreenCoordinates(screenX: Float, screenY: Float): Int? {
        return try {
            synchronized(view.cacheAccessLock) {
                view.pageOffsets.forEach { (pageNum, pageOffset) ->
                    val originalPageSize = view.pageSizes[pageNum] ?: return@forEach
                    val effectiveZoom = view.zoomAnimator.baseZoom * view.zoomAnimator.currentZoomScale
                    val scaledWidth = originalPageSize.first * effectiveZoom
                    val scaledHeight = originalPageSize.second * effectiveZoom
                    val pageLeft = (view.width - scaledWidth) / 2f

                    val screenPageLeft = pageLeft - view.scrollHandler.scrollX
                    val screenPageTop = pageOffset - view.scrollHandler.scrollY
                    val screenPageRight = screenPageLeft + scaledWidth
                    val screenPageBottom = screenPageTop + scaledHeight

                    if (screenX in screenPageLeft..screenPageRight &&
                        screenY >= screenPageTop && screenY <= screenPageBottom) {
                        return pageNum
                    }
                }
            }

            null
        } catch (e: Exception) {
            Log.e(TAG, "Error finding page at screen coordinates", e)
            null
        }
    }
}
