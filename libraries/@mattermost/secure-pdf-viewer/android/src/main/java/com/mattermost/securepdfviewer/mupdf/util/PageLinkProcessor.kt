package com.mattermost.securepdfviewer.mupdf.util

import android.graphics.RectF
import android.util.Log
import com.artifex.mupdf.fitz.Link
import com.artifex.mupdf.fitz.Page
import com.mattermost.securepdfviewer.mupdf.model.MuPDFLink

/**
 * Utility class for processing and extracting links from MuPDF pages.
 *
 * This class handles the extraction and validation of links from PDF pages,
 * supporting both internal document navigation and external URL links.
 * It provides comprehensive bounds validation and attempts to resolve
 * internal link destinations.
 */
internal object PageLinkProcessor {

    private const val TAG = "PageLinkProcessor"

    /**
     * Extracts all links present on the given page with comprehensive bounds validation.
     *
     * This method processes the page's link annotations, extracting both internal
     * and external links with their associated metadata. Links are validated to
     * ensure they have proper bounds and contain meaningful destinations.
     *
     * The method handles various link types:
     * - External URLs (http, https, mailto, etc.)
     * - Internal document references (page jumps, named destinations)
     * - Cross-reference links within the document
     *
     * @param page The MuPDF Page to extract links from
     * @param pageNumber The page number for logging purposes
     * @return List of validated MuPDFLink objects found on the page
     */
    fun extractLinks(page: Page, pageNumber: Int): List<MuPDFLink> {
        return try {
            val links = page.links
            links?.mapNotNull { link ->
                try {
                    // Validate link bounds to ensure they're meaningful
                    val bounds = link.bounds
                    if (bounds.x0 < bounds.x1 && bounds.y0 < bounds.y1) {
                        MuPDFLink(
                            bounds = RectF(bounds.x0, bounds.y0, bounds.x1, bounds.y1),
                            uri = link.uri?.takeIf { it.isNotEmpty() },
                            destinationPage = resolveInternalLinkPage(link, pageNumber)
                        )
                    } else {
                        null
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Error processing link on page $pageNumber", e)
                    null
                }
            } ?: emptyList()
        } catch (e: Exception) {
            Log.e(TAG, "Error getting links for page $pageNumber", e)
            emptyList()
        }
    }

    /**
     * Attempts to resolve the destination page for internal document links.
     *
     * This method implements a best-effort approach to extracting page numbers
     * from internal link URIs. PDF internal linking can be complex, involving
     * named destinations, page references, and various URI formats.
     *
     * Currently supports:
     * - Simple page references (#page=N format)
     * - Basic fragment identifiers
     *
     * @param link The MuPDF Link object to analyze
     * @param pageNumber The current page number for logging purposes
     * @return 0-based page number if successfully resolved, null otherwise
     */
    private fun resolveInternalLinkPage(link: Link, pageNumber: Int): Int? {
        return try {
            val uri = link.uri
            when {
                uri.isNullOrEmpty() -> {
                    // Internal links might not have URI but could have other properties
                    // This would require more complex MuPDF API usage
                    null
                }
                uri.startsWith("#page=") -> {
                    // Simple page reference format (#page=1, #page=2, etc.)
                    val pageMatch = Regex("#page=(\\d+)").find(uri)
                    pageMatch?.groupValues?.get(1)?.toIntOrNull()?.minus(1) // Convert to 0-based
                }
                uri.startsWith("#") -> {
                    // Other internal reference formats could be handled here
                    // (named destinations, section references, etc.)
                    null
                }
                else -> null
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error resolving internal link on page $pageNumber", e)
            null
        }
    }
}
