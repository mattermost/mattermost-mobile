package com.mattermost.securepdfviewer.pdfium.interaction

import android.graphics.RectF
import android.util.Log
import com.mattermost.pdfium.model.PdfLink
import com.mattermost.securepdfviewer.pdfium.PdfPage
import com.mattermost.securepdfviewer.pdfium.shared.PdfContext
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking

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
class LinkHandler(private val context: PdfContext) {

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
            val doc = context.document

            // Find which page was tapped
            val pageNum = context.coordinateConverter.getPageAtScreenCoordinates(screenX, screenY)
            if (pageNum == null) {
                Log.d(TAG, "No page found at screen coordinates")
                return false
            }

            Log.d(TAG, "Found page $pageNum at tap location")

            val pageCoordinates = context.coordinateConverter.screenToPageCoordinates(screenX, screenY, pageNum)
            if (pageCoordinates == null) {
                Log.d(TAG, "Failed to convert to page coordinates")
                return false
            }

            Log.d(TAG, "Page coordinates: (${pageCoordinates.x}, ${pageCoordinates.y})")

            val page = doc.getPage(pageNum)
            val link = runBlocking { findLinkWithHitSlop(page, pageCoordinates.x, pageCoordinates.y, pageNum) }

            if (link != null) {
                Log.d(TAG, "Link found: ${link.getType()} - ${link.uri ?: "page ${link.destinationPage}"}")

                when {
                    link.isInternal() && link.destinationPage != null -> {
                        context.viewScope.launch {
                            context.zoomAnimator.zoomToBase()
                            context.layoutCalculator.jumpToPage(link.destinationPage!!)
                        }
                    }
                    link.isExternal() -> {
                        context.onLinkTapped?.invoke(link)
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
    private suspend fun findLinkWithHitSlop(page: PdfPage, pageX: Float, pageY: Float, pageNum: Int): PdfLink? {
        return try {
            val links = context.cacheManager.getCachedLinks(pageNum) ?: context.nativeCoordinator.withNativeAccess("get-links-$pageNum") { page.getLinksSafe() }
            if (links.isNullOrEmpty()) return null
            context.cacheManager.cacheLinks(pageNum, links)

            // Convert hit slop from screen pixels to page coordinates
            val hitSlopPx = context.dpToPx(LINK_HIT_SLOP_DP)
            val pageSize =  context.cacheManager.withSynchronizedCache { context.cacheManager.getPageSize(pageNum) } ?: return null
            val scaledWidth = pageSize.first * context.zoomAnimator.baseZoom

            // Calculate hit slop in page coordinate space
            val hitSlopPage = (hitSlopPx / scaledWidth) * pageSize.first

            Log.d(TAG, "Checking ${links.size} links with hit slop: $hitSlopPage page units")

            // Then try with hit slop expansion
            links.find { link ->
                val correctedBounds = RectF(
                    link.bounds.left,
                    minOf(link.bounds.top, link.bounds.bottom),
                    link.bounds.right,
                    maxOf(link.bounds.top, link.bounds.bottom)
                )

                val expandedBounds = RectF(
                    correctedBounds.left - hitSlopPage,
                    correctedBounds.top - hitSlopPage,
                    correctedBounds.right + hitSlopPage,
                    correctedBounds.bottom + hitSlopPage
                )

                Log.d(TAG, "Link expanded bounds expandedBounds")

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
