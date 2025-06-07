package com.mattermost.securepdfviewer.mupdf.interaction

import android.graphics.RectF
import android.util.Log
import com.mattermost.securepdfviewer.mupdf.MuPDFPage
import com.mattermost.securepdfviewer.mupdf.model.MuPDFLink
import com.mattermost.securepdfviewer.mupdf.MuPDFView
import com.mattermost.securepdfviewer.mupdf.util.ViewUtils

/**
 * Handles link detection and interaction within PDF pages.
 *
 * This class manages the complete link handling pipeline:
 * - Coordinate conversion from screen space to page space
 * - Link hit testing with configurable tolerance for easier tapping
 * - Navigation handling for both internal page links and external URLs
 * - Hit slop implementation for improved touch accuracy
 *
 * The link handler integrates with the coordinate conversion system to accurately
 * map touch events to PDF page coordinates, accounting for zoom level, scroll
 * position, and page layout.
 */
internal class LinkHandler(private val view: MuPDFView) {

    companion object {
        private const val TAG = "LinkHandler"
        private const val LINK_HIT_SLOP_DP = 8
    }

    /**
     * Handles link tap detection and navigation.
     *
     * Performs coordinate conversion and link hit testing with tolerance
     * for easier link activation. Handles both internal page navigation
     * and external URL callbacks.
     *
     * @param screenX X coordinate of tap on screen
     * @param screenY Y coordinate of tap on screen
     * @return true if a link was found and handled, false otherwise
     */
    fun handleLinkTap(screenX: Float, screenY: Float): Boolean {
        return try {
            val doc = view.document ?: return false

            // Find which page was tapped
            val pageNum = view.coordinateConverter.getPageAtScreenCoordinates(screenX, screenY)
            if (pageNum == null) {
                Log.d(TAG, "No page found at screen coordinates")
                return false
            }

            Log.d(TAG, "Found page $pageNum at tap location")

            val pageCoordinates = view.coordinateConverter.screenToPageCoordinates(screenX, screenY, pageNum)
            if (pageCoordinates == null) {
                Log.d(TAG, "Failed to convert to page coordinates")
                return false
            }

            Log.d(TAG, "Page coordinates: (${pageCoordinates.x}, ${pageCoordinates.y})")

            val page = doc.getPage(pageNum)
            val link = findLinkWithHitSlop(page, pageCoordinates.x, pageCoordinates.y, pageNum)
            page.destroy()

            if (link != null) {
                Log.d(TAG, "Link found: ${link.getType()} - ${link.uri ?: "page ${link.destinationPage}"}")

                when {
                    link.isInternal() && link.destinationPage != null -> {
                        view.jumpToPage(link.destinationPage)
                    }
                    link.isExternal() -> {
                        view.onLinkTapped?.invoke(link)
                    }
                    else -> {
                        Log.w(TAG, "Unknown link type: $link")
                    }
                }
                return true
            } else {
                Log.d(TAG, "No link found at page coordinates")
            }

            false
        } catch (e: Exception) {
            Log.e(TAG, "Error handling link tap", e)
            false
        }
    }

    /**
     * Finds a link near the specified point with hit slop tolerance.
     *
     * Implements a two-pass link detection system: first tries exact hit,
     * then expands search area with configurable hit slop for easier tapping.
     *
     * @param page The page to search for links
     * @param pageX X coordinate in page space
     * @param pageY Y coordinate in page space
     * @param pageNum Page number for coordinate conversion
     * @return Link if found within hit slop area, null otherwise
     */
    private fun findLinkWithHitSlop(page: MuPDFPage, pageX: Float, pageY: Float, pageNum: Int): MuPDFLink? {
        return try {
            val links = page.getLinks()
            if (links.isEmpty()) return null

            // Convert hit slop from screen pixels to page coordinates
            val hitSlopPx = ViewUtils.dpToPx(view.context, LINK_HIT_SLOP_DP)
            val pageSize = synchronized(view.cacheAccessLock) { view.pageSizes[pageNum] } ?: return null
            val scaledWidth = pageSize.first * view.zoomAnimator.baseZoom

            // Calculate hit slop in page coordinate space
            val hitSlopPage = (hitSlopPx / scaledWidth) * pageSize.first

            Log.d(TAG, "Checking ${links.size} links with hit slop: $hitSlopPage page units")

            // First try exact hit (no slop)
            links.find { link -> link.bounds.contains(pageX, pageY) }?.let { return it }

            // Then try with hit slop expansion
            links.find { link ->
                val expandedBounds = RectF(
                    link.bounds.left - hitSlopPage,
                    link.bounds.top - hitSlopPage,
                    link.bounds.right + hitSlopPage,
                    link.bounds.bottom + hitSlopPage
                )

                val contains = expandedBounds.contains(pageX, pageY)
                if (contains) {
                    Log.d(TAG, "Link hit with slop - original: ${link.bounds}, expanded: $expandedBounds, tap: ($pageX, $pageY)")
                }
                contains
            }

        } catch (e: Exception) {
            Log.e(TAG, "Error finding link with hit slop", e)
            null
        }
    }
}
