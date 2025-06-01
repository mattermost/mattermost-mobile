package com.mattermost.securepdfviewer.mupdf.model

import android.graphics.RectF

/**
 * Data class representing a link found on a PDF page with type classification.
 *
 * This class encapsulates all information about a PDF link, including its
 * position on the page, destination (URL or page number), and convenience
 * methods for determining link type and behavior.
 *
 * @property bounds Rectangle defining the clickable area of the link in page coordinates
 * @property uri The URI for external links (http, mailto, etc.) or null for internal links
 * @property destinationPage Target page number (0-based) for internal document links
 */
data class MuPDFLink(
    val bounds: RectF,
    val uri: String?,
    val destinationPage: Int?
) {
    /**
     * Determines if this link points to an external resource.
     *
     * @return true if the link has a URI that doesn't start with '#' (indicating external)
     */
    fun isExternal(): Boolean = !uri.isNullOrEmpty() && !uri.startsWith("#")

    /**
     * Determines if this link points to a location within the current document.
     *
     * @return true if the link has a destination page or an internal URI reference
     */
    fun isInternal(): Boolean = destinationPage != null || (uri?.startsWith("#") == true)

    /**
     * Gets a human-readable string describing the link type.
     * Useful for logging, debugging, and accessibility features.
     *
     * @return String describing link type ("external", "internal", or "unknown")
     */
    fun getType(): String = when {
        isExternal() -> "external"
        isInternal() -> "internal"
        else -> "unknown"
    }
}
