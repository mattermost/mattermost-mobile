package com.mattermost.securepdfviewer.mupdf.manager

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.util.Log
import androidx.core.graphics.withTranslation
import com.mattermost.securepdfviewer.mupdf.MuPDFView
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.concurrent.atomic.AtomicBoolean


/**
 * Handles all page rendering, drawing and display operations for the PDF viewer.
 *
 * This class manages:
 * - Asynchronous page rendering using MuPDF
 * - Canvas drawing operations for pages and UI elements
 * - Bitmap memory management and constraints
 * - Rendering state management and thread safety
 * - Page placeholder and status message display
 *
 * The renderer uses coroutines for non-blocking page rendering and applies
 * memory constraints to prevent crashes on devices with limited memory.
 */
internal class PageRenderer(private val view: MuPDFView) {

    companion object {
        private const val TAG = "PageRenderer"

        // Memory management constants
        private const val MAX_BITMAP_SIZE = 4096
        private const val MAX_BITMAP_MEMORY = 32 * 1024 * 1024
    }

    // Rendering state

    internal val isRenderInProgress = AtomicBoolean(false)

    // Pre-allocated Paint objects for optimal performance
    private val backgroundPaint = Paint().apply { color = Color.LTGRAY }
    private val bitmapPaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
    private val placeholderPaint = Paint().apply { color = Color.WHITE }
    private val borderPaint = Paint().apply {
        color = Color.GRAY
        style = Paint.Style.STROKE
        strokeWidth = 2f
    }
    private val textPaint = Paint().apply {
        color = Color.GRAY
        textAlign = Paint.Align.CENTER
        textSize = 32f
        isAntiAlias = true
    }

    // Public API

    /**
     * Draws the complete PDF view on the provided canvas.
     *
     * Handles different view states and delegates to appropriate drawing methods.
     */
    fun drawView(canvas: Canvas) {
        // Draw background
        canvas.drawRect(0f, 0f, view.width.toFloat(), view.height.toFloat(), backgroundPaint)

        when {
            view.isViewDestroyed() -> return
            view.isDocumentLoading() -> {
                drawMessage(canvas, "Loading Document...")
                return
            }
            view.document?.isValid() != true -> {
                drawMessage(canvas, "No Document")
                return
            }
            !view.isViewReady() -> {
                drawMessage(canvas, "Preparing...")
                return
            }
            else -> {
                drawPages(canvas)
                if (!view.zoomAnimator.isZooming) {
                    view.pageCacheManager.manageCache()
                }
            }
        }
    }

    /**
     * Renders a specific page asynchronously with memory constraints.
     *
     * Handles the complete page rendering pipeline:
     * - Calculates optimal bitmap size based on zoom level
     * - Applies memory constraints to prevent crashes
     * - Renders page on background thread using MuPDF
     * - Caches result and triggers view invalidation
     *
     * @param pageNum 0-based page number to render
     */
    fun renderPage(pageNum: Int) {
        if (!isRenderInProgress.compareAndSet(false, true)) {
            return
        }

        view.viewScope.launch {
            try {
                val doc = view.document ?: return@launch
                val pageSize = synchronized(view.pageCacheManager.cacheAccessLock) {
                    view.pageCacheManager.pageSizes[pageNum]
                }

                if (pageSize == null) {
                    Log.w(TAG, "No page size for page $pageNum")
                    return@launch
                }

                val bitmap = withContext(Dispatchers.IO) {
                    val page = doc.getPage(pageNum)

                    val effectiveZoom = view.zoomAnimator.baseZoom * view.zoomAnimator.currentZoomScale
                    val rawTargetWidth = (pageSize.first * effectiveZoom).toInt()
                    val rawTargetHeight = (pageSize.second * effectiveZoom).toInt()

                    // Apply size constraints to prevent crashes
                    val targetWidth = rawTargetWidth.coerceAtMost(MAX_BITMAP_SIZE)
                    val targetHeight = rawTargetHeight.coerceAtMost(MAX_BITMAP_SIZE)

                    // Check memory constraints
                    val estimatedMemory = targetWidth * targetHeight * 4 // ARGB_8888 = 4 bytes per pixel
                    if (estimatedMemory > MAX_BITMAP_MEMORY) {
                        val scaleFactor = kotlin.math.sqrt(MAX_BITMAP_MEMORY.toFloat() / estimatedMemory)
                        val safeWidth = (targetWidth * scaleFactor).toInt()
                        val safeHeight = (targetHeight * scaleFactor).toInt()
                        Log.d(TAG, "Bitmap too large, scaling down: ${targetWidth}x${targetHeight} -> ${safeWidth}x${safeHeight}")

                        val result = page.renderToBitmap(safeWidth, safeHeight)
                        page.destroy()
                        result
                    } else {
                        val result = page.renderToBitmap(targetWidth, targetHeight)
                        page.destroy()
                        result
                    }
                }

                if (!view.isViewDestroyed() && bitmap != null) {
                    view.pageCacheManager.cachePage(pageNum, bitmap)
                    view.invalidate()
                } else {
                    bitmap?.recycle()
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error rendering page $pageNum", e)
            } finally {
                isRenderInProgress.set(false)
            }
        }
    }

    /**
     * Renders the current page asynchronously for initial display.
     *
     * Used during document loading to render the first visible page
     * before the full rendering system is active.
     */
    fun renderCurrentPage() {
        val doc = view.document
        if (doc?.isValid() != true || view.isViewDestroyed()) {
            Log.d(
                TAG,
                "Cannot render: doc valid=${doc?.isValid()}, destroyed=${view.isViewDestroyed()}"
            )
            return
        }

        if (!isRenderInProgress.compareAndSet(false, true)) {
            Log.d(TAG, "Render already in progress, skipping")
            return
        }

        view.viewScope.launch {
            try {
                val pageCount = doc.getPageCount()
                if (pageCount <= 0 || view.currentPage >= pageCount) {
                    Log.w(TAG, "Invalid page state: currentPage=${view.currentPage}, pageCount=$pageCount")
                    return@launch
                }

                val pageSize = doc.getPageSize(view.currentPage)
                if (pageSize == null) {
                    Log.e(TAG, "Could not get page ${view.currentPage} size")
                    return@launch
                }

                val bitmap = withContext(Dispatchers.IO) {
                    val page = doc.getPage(view.currentPage)

                    val targetWidth = (pageSize.first * view.zoomAnimator.baseZoom).toInt()
                    val targetHeight = (pageSize.second * view.zoomAnimator.baseZoom).toInt()

                    val result = page.renderToBitmap(targetWidth, targetHeight)
                    page.destroy()
                    result
                }

                if (!view.isViewDestroyed() && bitmap != null) {
                    view.pageCacheManager.cachedBitmap?.recycle()
                    view.pageCacheManager.cachedBitmap = bitmap

                    Log.d(TAG, "Page ${view.currentPage} rendered, invalidating view")
                    view.invalidate()
                } else {
                    bitmap?.recycle()
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error rendering page ${view.currentPage}", e)
            } finally {
                isRenderInProgress.set(false)
            }
        }
    }

    // Private drawing methods

    /**
     * Draws all visible pages with proper coordinate transformation.
     *
     * Uses canvas translation to handle scroll offsets efficiently,
     * allowing pages to be drawn at their calculated positions.
     */
    private fun drawPages(canvas: Canvas) {
        val visiblePages = view.layoutCalculator.getVisiblePages()

        canvas.withTranslation(-view.scrollHandler.scrollX, -view.scrollHandler.scrollY) {
            synchronized(view.pageCacheManager.cacheAccessLock) {
                visiblePages.forEach { pageNum ->
                    drawPage(this, pageNum)
                }
            }
        }
    }

    /**
     * Draws a single page at its calculated position.
     *
     * Handles both cached bitmap rendering and placeholder display
     * when pages are still being rendered.
     *
     * @param canvas Canvas to draw on (already translated)
     * @param pageNum Page number to draw
     */
    private fun drawPage(canvas: Canvas, pageNum: Int) {
        try {
            val originalPageSize = view.pageCacheManager.pageSizes[pageNum] ?: return
            val bitmap = view.pageCacheManager.getCachedPage(pageNum)

            val effectiveZoom = view.zoomAnimator.baseZoom * view.zoomAnimator.currentZoomScale
            val scaledWidth = originalPageSize.first * effectiveZoom
            val scaledHeight = originalPageSize.second * effectiveZoom
            val left = (view.width - scaledWidth) / 2f

            val pageOffset = if (view.zoomAnimator.isZooming) {
                // During animation, calculate offset in real-time to prevent layout jumps
                view.layoutCalculator.calculatePageOffsetRealTime(pageNum, effectiveZoom)
            } else {
                // Use cached offset when not animating
                view.pageCacheManager.pageOffsets[pageNum] ?: return
            }

            val destRect = RectF(left, pageOffset, left + scaledWidth, pageOffset + scaledHeight)

            if (bitmap?.isRecycled == false) {
                canvas.drawBitmap(bitmap, null, destRect, bitmapPaint)
            } else if (!view.zoomAnimator.isZooming) {
                // Only draw placeholder when not zooming to reduce visual noise
                canvas.drawRect(destRect, placeholderPaint)
                canvas.drawRect(destRect, borderPaint)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error drawing page $pageNum", e)
        }
    }

    /**
     * Draws a centered message on the canvas for status display.
     *
     * @param canvas Canvas to draw on
     * @param message Message text to display
     */
    private fun drawMessage(canvas: Canvas, message: String) {
        canvas.drawText(message, view.width / 2f, view.height / 2f, textPaint)
    }
}
