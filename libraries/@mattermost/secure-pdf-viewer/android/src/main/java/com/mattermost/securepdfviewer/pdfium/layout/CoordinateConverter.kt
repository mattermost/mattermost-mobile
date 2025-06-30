package com.mattermost.securepdfviewer.pdfium.layout

import android.graphics.PointF
import android.util.Log
import com.mattermost.securepdfviewer.pdfium.shared.PdfContext
import com.mattermost.securepdfviewer.pdfium.shared.PdfViewInterface

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
class CoordinateConverter(private val context: PdfContext, private val view: PdfViewInterface) {

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
            context.cacheManager.withSynchronizedCache {
                val pageOffset = context.cacheManager.getPageOffset(pageNum) ?: return@withSynchronizedCache null
                val originalPageSize = context.cacheManager.getPageSize(pageNum) ?: return@withSynchronizedCache null

                val effectiveZoom = context.zoomAnimator.baseZoom * context.zoomAnimator.currentZoomScale
                val scaledWidth = originalPageSize.first * effectiveZoom
                val scaledHeight = originalPageSize.second * effectiveZoom
                val pageLeft = (view.viewWidth - scaledWidth) / 2f

                // Check if coordinates are within page bounds
                if (screenX < pageLeft - context.scrollHandler.scrollX || screenX > pageLeft + scaledWidth - context.scrollHandler.scrollX ||
                    screenY < pageOffset - context.scrollHandler.scrollY || screenY > pageOffset + scaledHeight - context.scrollHandler.scrollY) {
                    return@withSynchronizedCache null
                }

                // Convert to relative coordinates within the page
                val relativeX = (screenX - (pageLeft - context.scrollHandler.scrollX)) / scaledWidth
                val relativeY = (screenY - (pageOffset - context.scrollHandler.scrollY)) / scaledHeight

                // Convert to actual page coordinates
                val pageX = originalPageSize.first * relativeX
                val pageY = originalPageSize.second * (1f - relativeY)

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
            val result = context.cacheManager.withSynchronizedCache {
                context.cacheManager.getPageOffsets().forEach { (pageNum, pageOffset) ->
                    val originalPageSize = context.cacheManager.getPageSize(pageNum) ?: return@forEach
                    val effectiveZoom = context.zoomAnimator.baseZoom * context.zoomAnimator.currentZoomScale
                    val scaledWidth = originalPageSize.first * effectiveZoom
                    val scaledHeight = originalPageSize.second * effectiveZoom
                    val pageLeft = (view.viewWidth - scaledWidth) / 2f

                    val screenPageLeft = pageLeft - context.scrollHandler.scrollX
                    val screenPageTop = pageOffset - context.scrollHandler.scrollY
                    val screenPageRight = screenPageLeft + scaledWidth
                    val screenPageBottom = screenPageTop + scaledHeight

                    if (screenX in screenPageLeft..screenPageRight &&
                        screenY >= screenPageTop && screenY <= screenPageBottom) {
                        return@withSynchronizedCache pageNum
                    }
                }
                null
            }

            result
        } catch (e: Exception) {
            Log.e(TAG, "Error finding page at screen coordinates", e)
            null
        }
    }
}
