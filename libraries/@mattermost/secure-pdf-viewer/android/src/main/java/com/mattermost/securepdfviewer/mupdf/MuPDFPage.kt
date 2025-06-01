package com.mattermost.securepdfviewer.mupdf

import android.graphics.Bitmap
import android.graphics.RectF
import android.util.Log
import com.artifex.mupdf.fitz.ColorSpace
import com.artifex.mupdf.fitz.Matrix
import com.artifex.mupdf.fitz.Page
import com.mattermost.securepdfviewer.mupdf.model.MuPDFLink
import com.mattermost.securepdfviewer.mupdf.util.PageLinkProcessor
import com.mattermost.securepdfviewer.mupdf.util.PixmapBitmapConverter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Wrapper for MuPDF Page with optimized bitmap rendering and link extraction.
 *
 * This class serves as a high-level interface to MuPDF native Page functionality,
 * providing enhanced safety, performance optimizations, and Android-specific features
 * for PDF page operations within the secure PDF viewer.
 *
 * Key capabilities and optimizations:
 * - **Asynchronous Rendering**: Coroutine-based bitmap rendering that doesn't block the UI thread
 * - **Memory Efficiency**: Optimized color space conversion and memory management
 * - **Link Extraction**: Comprehensive link detection and classification (internal/external)
 * - **Error Resilience**: Robust error handling to prevent crashes during page operations
 * - **Resource Management**: Proper cleanup of native MuPDF resources
 *
 * The rendering pipeline converts MuPDF native pixmap format to Android-compatible
 * ARGB bitmaps with optimized color space handling for both RGB and RGBA sources.
 *
 * @param page The underlying MuPDF Page instance (managed internally)
 * @param pageNumber 0-based page index within the parent document
 * @param document Reference to the parent MuPDFDocument for context and validation
 */
class MuPDFPage internal constructor(
    private val page: Page,
    private val pageNumber: Int,
    private val document: MuPDFDocument
) {

    companion object {
        private const val TAG = "MuPDFPage"
    }

    // Page geometry and bounds access

    /**
     * Gets the page bounds in PDF coordinate space.
     *
     * Returns the page's natural bounds as defined in the PDF, typically in points
     * (1/72 inch units). These bounds represent the page's media box and are used
     * for coordinate transformations and scaling calculations.
     *
     * @return RectF containing the page bounds in PDF coordinate units
     */
    private fun getBounds(): RectF {
        val bounds = page.bounds
        return RectF(bounds.x0, bounds.y0, bounds.x1, bounds.y1)
    }

    // Asynchronous rendering operations

    /**
     * Renders the page to an Android bitmap asynchronously using coroutines.
     *
     * This is the primary method for converting PDF page content to displayable
     * bitmap format. The rendering process includes:
     * - Optimal scaling calculation to fit target dimensions while preserving aspect ratio
     * - Native MuPDF rendering to pixmap format
     * - Color space conversion to Android-compatible ARGB format
     * - Proper resource cleanup to prevent memory leaks
     *
     * The operation is performed on a background thread to avoid blocking the UI,
     * making it suitable for use in scrollable views and interactive applications.
     *
     * @param width Target bitmap width in pixels
     * @param height Target bitmap height in pixels
     * @return Rendered bitmap in ARGB_8888 format, or null if rendering fails
     */
    suspend fun renderToBitmap(width: Int, height: Int): Bitmap? = withContext(Dispatchers.Default) {
        try {
            Log.d(TAG, "Rendering page $pageNumber to ${width}x${height}")

            if (width <= 0 || height <= 0) {
                Log.e(TAG, "Invalid dimensions: ${width}x${height}")
                return@withContext null
            }

            val bounds = getBounds()
            val scaleX = width / bounds.width()
            val scaleY = height / bounds.height()
            val scale = minOf(scaleX, scaleY).coerceAtLeast(0.1f)

            val matrix = Matrix(scale)
            val pixmap = page.toPixmap(matrix, ColorSpace.DeviceRGB, false)

            Log.d(TAG, "Pixmap created: ${pixmap.width}x${pixmap.height}, components: ${pixmap.numberOfComponents}")

            val bitmap = PixmapBitmapConverter.convertPixmapToBitmap(pixmap)
            pixmap.destroy()

            if (bitmap != null) {
                Log.d(TAG, "Successfully rendered page $pageNumber to bitmap: ${bitmap.width}x${bitmap.height}")
            } else {
                Log.e(TAG, "Failed to convert pixmap to bitmap for page $pageNumber")
            }

            bitmap

        } catch (e: Exception) {
            Log.e(TAG, "Error rendering page $pageNumber to bitmap", e)
            null
        }
    }

    // Link extraction and processing

    /**
     * Extracts all links present on this page with comprehensive bounds validation.
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
     * @return List of validated MuPDFLink objects found on the page
     */
    fun getLinks(): List<MuPDFLink> {
        return PageLinkProcessor.extractLinks(page, pageNumber)
    }

    // Resource management

    /**
     * Destroys the page and frees all associated native resources.
     *
     * This method should be called when the page is no longer needed to prevent
     * memory leaks. After calling destroy(), this page object should not be used
     * for any further operations.
     *
     * The cleanup process is designed to be safe even if called multiple times
     * or if the underlying native resources have already been freed.
     */
    fun destroy() {
        try {
            Log.d(TAG, "Destroying page $pageNumber")
            page.destroy()
        } catch (e: Exception) {
            Log.w(TAG, "Error destroying page $pageNumber", e)
        }
    }
}
