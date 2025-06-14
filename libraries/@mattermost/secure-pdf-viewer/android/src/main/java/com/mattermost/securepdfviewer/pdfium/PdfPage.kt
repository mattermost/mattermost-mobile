package com.mattermost.securepdfviewer.pdfium

import android.graphics.Bitmap
import android.graphics.Bitmap.createBitmap
import android.util.Log
import com.mattermost.pdfium.PdfBridge
import com.mattermost.pdfium.model.PdfLink
import com.mattermost.securepdfviewer.pdfium.shared.PdfContext

/**
 * Wrapper for PDFium page functionality, providing optimized rendering and link extraction.
 */
class PdfPage internal constructor(
    private val context: PdfContext,
    private val pdfBridge: PdfBridge,
    private val pageNumber: Int
) {

    companion object {
        private const val TAG = "PdfPage"
    }

    /**
     * Asynchronous rendering of the page to a Bitmap.
     *
     * @param width Target width in pixels.
     * @param height Target height in pixels.
     * @param scale Optional scaling factor (default is calculated to fit width/height).
     * @return Rendered Bitmap or null if rendering fails.
     */
    suspend fun renderToBitmap(width: Int, height: Int, scale: Float = 1.0f): Bitmap? {
        if (width <= 0 || height <= 0) {
            Log.e(TAG, "Invalid dimensions: ${width}x${height}")
            return null
        }

        Log.d(TAG, "Rendering page $pageNumber to ${width}x${height}")

        return context.nativeCoordinator.withNativeAccess("render-page-$pageNumber-${width}x${height}") {
            try {
                val bitmap = createBitmap(width, height, Bitmap.Config.ARGB_8888)
                val success = pdfBridge.renderPageToBitmap(pageNumber, bitmap, scale)

                if (success) {
                    Log.d(TAG, "Successfully rendered page $pageNumber")
                    bitmap
                } else {
                    Log.e(TAG, "Failed to render page $pageNumber")
                    bitmap.recycle()
                    null
                }

            } catch (e: Exception) {
                Log.e(TAG, "Error rendering page $pageNumber", e)
                null
            }
        }
    }

    /**
     * Extracts all links present on this page using native coordinator.
     */
    suspend fun getLinksSafe(): List<PdfLink> {
        return context.nativeCoordinator.withNativeAccess("get-links-$pageNumber") {
            try {
                pdfBridge.getLinksForPage(pageNumber).toList()
            } catch (e: Exception) {
                Log.e(TAG, "Error getting links for page $pageNumber", e)
                emptyList()
            }
        } ?: emptyList()
    }
}
