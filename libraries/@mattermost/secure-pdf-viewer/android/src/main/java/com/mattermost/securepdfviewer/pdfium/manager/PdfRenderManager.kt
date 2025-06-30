package com.mattermost.securepdfviewer.pdfium.manager

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.util.Log
import androidx.core.graphics.withTranslation
import com.mattermost.securepdfviewer.pdfium.shared.PdfContext
import com.mattermost.securepdfviewer.pdfium.shared.PdfViewInterface
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger
import kotlin.coroutines.cancellation.CancellationException

class PdfRenderManager(private val context: PdfContext, private val view: PdfViewInterface) {
    companion object {
        private const val TAG = "PdfRenderManager"

        private const val PRELOAD_RADIUS = 2

        private const val MAX_BITMAP_SIZE = 4096
        private const val MAX_BITMAP_MEMORY = 32 * 1024 * 1024
        private const val MAX_CONCURRENT_RENDERS = 3
        private const val ZOOM_TOLERANCE = 0.25f // Allow 50% difference before requiring re-render
    }

    // Cancellation support
    private val isDestroyed = AtomicBoolean(false)
    private val activeRenderJobs = ConcurrentHashMap<Int, Job>() // pageNum -> Job

    // Thread-safe rendering state
    private val currentlyRenderingPages = ConcurrentHashMap<Int, Float>() // pageNum -> zoomScale
    private val concurrentRenderCount = AtomicInteger(0)

    // Render queue system
    private val pendingRenders = ConcurrentHashMap<Int, Float>() // pageNum -> zoomScale

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

    /**
     * Cancels all ongoing renders and clears queues.
     * Call this when the view is destroyed or document changes.
     */
    suspend fun cancelAllRendersAndWait() {
        if (isDestroyed.compareAndSet(false, true)) {
            Log.d(TAG, "Cancelling all renders - active: ${activeRenderJobs.size}, pending: ${pendingRenders.size}")

            // Cancel all active render jobs
            val jobs = activeRenderJobs.values.toList()
            activeRenderJobs.clear()
            pendingRenders.clear()
            currentlyRenderingPages.clear()

            jobs.forEach { job ->
                try {
                    job.cancel()
                } catch (e: Exception) {
                    Log.w(TAG, "Error cancelling render job", e)
                }
            }

            // Wait for all native calls to complete with timeout
            val startTime = System.currentTimeMillis()
            while (concurrentRenderCount.get() > 0 && (System.currentTimeMillis() - startTime) < 2000) {
                kotlinx.coroutines.delay(50)
            }

            concurrentRenderCount.set(0)
            Log.d(TAG, "All renders cancelled")
        }
    }

    /**
     * Checks if the manager is destroyed/cancelled.
     */
    private fun isActive(): Boolean = !isDestroyed.get() && !context.isViewDestroyed()

    /**
     * Intelligently clears and re-renders pages after zoom changes.
     *
     * Maintains visible pages in cache while clearing distant pages
     * to balance memory usage with user experience.
     */
    fun clearAndRerenderPages() {
        if (!isActive()) return

        try {
            val visiblePages = context.layoutCalculator.getVisiblePages()
            val currentZoom = context.zoomAnimator.baseZoom * context.zoomAnimator.currentZoomScale

            // Cancel any pending renders for pages that are no longer visible
            val iterator = pendingRenders.iterator()
            while (iterator.hasNext()) {
                val (pageNum, _) = iterator.next()
                if (pageNum !in visiblePages) {
                    iterator.remove()
                    cancelRenderJob(pageNum)
                }
            }

            // Don't clear bitmaps immediately - let them serve as placeholders
            // Just mark visible pages for high-priority re-rendering
            visiblePages.forEach { pageNum ->
                if (shouldRenderPage(pageNum, currentZoom)) {
                    queueHighPriorityRender(pageNum, currentZoom)
                }
            }

            // Clear non-visible pages to free memory
            context.cacheManager.clearNonVisiblePages(visiblePages)

            preRenderDocument()
            view.invalidate()

        } catch (e: Exception) {
            Log.e(TAG, "Error in smart cache clearing", e)
        }
    }

    /**
     * Manages cache for visible pages and preloading.
     *
     * This method orchestrates the cache management system:
     * - Identifies currently visible pages
     * - Triggers rendering for uncached visible pages
     * - Preloads adjacent pages for smooth scrolling
     * - Updates tracking of visible pages to reduce logging spam
     */
    private fun preRenderDocument() {
        if (!isActive()) return

        val doc = context.document

        if (!doc.isValid() || !context.isViewReady) {
            Log.d(TAG, "Cannot render: valid=${doc.isValid()}, destroyed=${context.isViewDestroyed()}, ready=${context.isViewReady}")
            return
        }

        val visiblePages = context.layoutCalculator.getVisiblePages()

        if (visiblePages.isEmpty()) {
            Log.w(TAG, "No visible pages found - scrollY=${context.scrollHandler.scrollY}, totalHeight=${context.scrollHandler.totalDocumentHeight}, viewHeight=${view.viewHeight}")
            Log.w(TAG, "Page offsets size: ${context.cacheManager.getPageOffsets().size}, Page sizes size: ${context.cacheManager.getPageSizes().size}")
        }

        // Log visible pages changes to reduce spam
        if (visiblePages != context.cacheManager.getLastVisiblePages()) {
            Log.d(TAG, "Managing cache for visible pages: $visiblePages")
            context.cacheManager.setLastVisiblePages(visiblePages.toList())
        }

        val currentPageNum = context.layoutCalculator.getCurrentVisiblePage()
        val currentZoom = context.zoomAnimator.baseZoom * context.zoomAnimator.currentZoomScale

        // Immediately start rendering visible pages that need it
        visiblePages.forEach { pageNum ->
            if (isActive() && shouldRenderPage(pageNum, currentZoom)) {
                if (pageNum == currentPageNum) {
                    startRenderImmediate(pageNum, currentZoom, highPriority = true)
                } else {
                    queueRender(pageNum, currentZoom)
                }
            }
        }

        // Preload adjacent pages for smooth scrolling
        for (i in 1..PRELOAD_RADIUS) {
            if (!isActive()) break

            val prevPage = currentPageNum - i
            val nextPage = currentPageNum + i

            if (prevPage >= 0 && shouldRenderPage(prevPage, currentZoom)) {
                queueRender(prevPage, currentZoom)
            }
            if (nextPage < doc.getPageCount() && shouldRenderPage(nextPage, currentZoom)) {
                queueRender(nextPage, currentZoom)
            }
        }
    }

    /**
     * Check if a page should be rendered based on cache state and zoom level
     */
    private fun shouldRenderPage(pageNum: Int, currentZoom: Float): Boolean {
        if (!isActive()) return false

        // Check if already rendering at current zoom
        val renderingZoom = currentlyRenderingPages[pageNum]
        if (renderingZoom != null && kotlin.math.abs(renderingZoom - currentZoom) < 0.1f) {
            return false
        }

        // Check if cache at correct zoom level
        val cached = context.cacheManager.getCachedPage(pageNum)
        if (cached == null || cached.isRecycled) {
            return true
        }

        val pageSize =
            context.cacheManager.withSynchronizedCache { context.cacheManager.getPageSize(pageNum) }
                ?: return true
        val expectedWidth = (pageSize.first * currentZoom).toInt()
        val expectedHeight = (pageSize.second * currentZoom).toInt()

        val widthDiff = kotlin.math.abs(cached.width - expectedWidth).toFloat() /
                maxOf(expectedWidth, cached.width)
        val heightDiff = kotlin.math.abs(cached.height - expectedHeight).toFloat() /
                maxOf(expectedHeight, cached.height)

        // More permissive tolerance - only re-render if significantly different
        return widthDiff > ZOOM_TOLERANCE || heightDiff > ZOOM_TOLERANCE
    }

    /**
     * Queue high priority render (for visible pages).
     */
    private fun queueHighPriorityRender(pageNum: Int, zoomScale: Float) {
        if (!isActive()) return

        // Cancel existing render if different zoom
        val existingZoom = currentlyRenderingPages[pageNum]
        if (existingZoom != null && kotlin.math.abs(existingZoom - zoomScale) > 0.1f) {
            cancelRenderJob(pageNum)
        }

        pendingRenders[pageNum] = zoomScale
        startRenderImmediate(pageNum, zoomScale, highPriority = true)
    }

    /**
     * Queue normal priority render (for preload pages).
     */
    private fun queueRender(pageNum: Int, zoomScale: Float) {
        if (!isActive()) return

        if (concurrentRenderCount.get() < MAX_CONCURRENT_RENDERS) {
            startRenderImmediate(pageNum, zoomScale, highPriority = false)
        } else {
            pendingRenders[pageNum] = zoomScale
        }
    }

    /**
     * Cancels a specific render job.
     */
    private fun cancelRenderJob(pageNum: Int) {
        activeRenderJobs[pageNum]?.let { job ->
            try {
                job.cancel()
                activeRenderJobs.remove(pageNum)
                currentlyRenderingPages.remove(pageNum)
                concurrentRenderCount.decrementAndGet()
                Log.d(TAG, "Cancelled render job for page $pageNum")
            } catch (e: Exception) {
                Log.w(TAG, "Error cancelling job for page $pageNum", e)
            }
        }
    }

    /**
     * Start rendering immediately if possible, with priority handling.
     */
    private fun startRenderImmediate(pageNum: Int, zoomScale: Float, highPriority: Boolean) {
        if (!isActive()) return

        if (!highPriority && concurrentRenderCount.get() >= MAX_CONCURRENT_RENDERS) {
            pendingRenders[pageNum] = zoomScale
            return
        }

        // For high priority, allow one extra concurrent render
        val maxConcurrent = if (highPriority) MAX_CONCURRENT_RENDERS + 1 else MAX_CONCURRENT_RENDERS
        if (concurrentRenderCount.get() >= maxConcurrent) {
            pendingRenders[pageNum] = zoomScale
            return
        }

        // Cancel existing render for this page if different zoom
        cancelRenderJob(pageNum)

        currentlyRenderingPages[pageNum] = zoomScale
        concurrentRenderCount.incrementAndGet()
        pendingRenders.remove(pageNum)

        val renderJob = context.viewScope.launch {
            try {
                if (!isActive()) {
                    Log.d(TAG, "Skipping render for page $pageNum - not active")
                    return@launch
                }

                val pageSize = context.cacheManager.withSynchronizedCache {
                    context.cacheManager.getPageSize(pageNum)
                }

                if (pageSize == null) {
                    Log.w(TAG, "No page size for page $pageNum")
                    return@launch
                }

                val bitmap = context.nativeCoordinator.withNativeAccess("render-page-$pageNum") {
                    if (!context.document.isValid()) {
                        Log.d(TAG, "Document invalid for page $pageNum")
                        return@withNativeAccess null
                    }

                    try {
                        val page = context.document.getPage(pageNum)

                        val rawTargetWidth = (pageSize.first * zoomScale).toInt()
                        val rawTargetHeight = (pageSize.second * zoomScale).toInt()

                        val targetWidth = rawTargetWidth.coerceAtMost(MAX_BITMAP_SIZE)
                        val targetHeight = rawTargetHeight.coerceAtMost(MAX_BITMAP_SIZE)

                        val estimatedMemory = targetWidth * targetHeight * 4
                        if (estimatedMemory > MAX_BITMAP_MEMORY) {
                            val scaleFactor =
                                kotlin.math.sqrt(MAX_BITMAP_MEMORY.toFloat() / estimatedMemory)
                            val safeWidth = (targetWidth * scaleFactor).toInt()
                            val safeHeight = (targetHeight * scaleFactor).toInt()
                            page.renderToBitmap(safeWidth, safeHeight, zoomScale)
                        } else {
                            page.renderToBitmap(targetWidth, targetHeight, zoomScale)
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Native render error for page $pageNum", e)
                        null
                    }
                }

                if (isActive() && bitmap != null) {
                    val currentZoom = context.zoomAnimator.baseZoom * context.zoomAnimator.currentZoomScale
                    if (kotlin.math.abs(currentZoom - zoomScale) < 0.5f) {
                        context.cacheManager.cachePage(pageNum, bitmap)
                        view.invalidate()
                        Log.d(TAG, "Page $pageNum rendered at zoom $zoomScale")
                    } else {
                        bitmap.recycle()
                        Log.d(TAG, "Page $pageNum render discarded - zoom changed")
                    }
                } else {
                    bitmap?.recycle()
                }
            } catch (e: CancellationException) {
                Log.d(TAG, "Render cancelled for page $pageNum")
                // Don't log as error - cancellation is expected
            } catch (e: Exception) {
                Log.e(TAG, "Error rendering page $pageNum", e)
            } finally {
                activeRenderJobs.remove(pageNum)
                currentlyRenderingPages.remove(pageNum)
                concurrentRenderCount.decrementAndGet()

                if (isActive()) {
                    processNextQueuedRender()
                }
            }
        }

        activeRenderJobs[pageNum] = renderJob
    }

    /**
     * Process the next item from the render queue.
     */
    private fun processNextQueuedRender() {
        if (!isActive() || concurrentRenderCount.get() >= MAX_CONCURRENT_RENDERS || pendingRenders.isEmpty()) {
            return
        }

        val iterator = pendingRenders.iterator()
        if (iterator.hasNext()) {
            val (pageNum, zoomScale) = iterator.next()
            iterator.remove()

            if (shouldRenderPage(pageNum, zoomScale)) {
                startRenderImmediate(pageNum, zoomScale, highPriority = false)
            }
        }
    }

    /**
     * Draws the complete PDF view on the provided canvas.
     *
     * Handles different view states and delegates to appropriate drawing methods.
     */
    fun drawView(canvas: Canvas) {
        if (!isActive()) return

        // Draw background
        canvas.drawRect(0f, 0f, view.viewWidth.toFloat(), view.viewHeight.toFloat(), backgroundPaint)

        when {
            context.isViewDestroyed() -> return
            context.documentManager.isDocumentLoading() -> {
                drawMessage(canvas, "Loading Document...")
                return
            }
            !context.document.isValid() -> {
                drawMessage(canvas, "No Document")
                return
            }
            !context.isViewReady -> {
                drawMessage(canvas, "Preparing...")
                return
            }
            else -> {
                drawPages(canvas)
                preRenderDocument()
            }
        }
    }

    /**
     * Draws a centered message on the canvas for status display.
     *
     * @param canvas Canvas to draw on
     * @param message Message text to display
     */
    private fun drawMessage(canvas: Canvas, message: String) {
        canvas.drawText(message, view.viewWidth / 2f, view.viewHeight / 2f, textPaint)
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
        if (!isActive()) return

        try {
            val originalPageSize = context.cacheManager.withSynchronizedCache { context.cacheManager.getPageSize(pageNum) } ?: return
            val effectiveZoom = context.zoomAnimator.baseZoom * context.zoomAnimator.currentZoomScale
            val scaledWidth = originalPageSize.first * effectiveZoom
            val scaledHeight = originalPageSize.second * effectiveZoom
            val left = (view.viewWidth - scaledWidth) / 2f

            val pageOffset = if (context.zoomAnimator.isZooming) {
                // During animation, calculate offset in real-time to prevent layout jumps
                context.layoutCalculator.calculatePageOffsetRealTime(pageNum, effectiveZoom)
            } else {
                // Use cached offset when not animating
                context.cacheManager.getPageOffset(pageNum) ?: return
            }

            val destRect = RectF(left, pageOffset, left + scaledWidth, pageOffset + scaledHeight)

            val bitmap = context.cacheManager.getCachedPage(pageNum)

            if (bitmap?.isRecycled == false) {
                canvas.drawBitmap(bitmap, null, destRect, bitmapPaint)
            } else if (!context.zoomAnimator.isZooming) {
                // Only draw placeholder when not zooming to reduce visual noise
                canvas.drawRect(destRect, placeholderPaint)
                canvas.drawRect(destRect, borderPaint)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error drawing page $pageNum", e)
        }
    }

    /**
     * Draws all visible pages with proper coordinate transformation.
     *
     * Uses canvas translation to handle scroll offsets efficiently,
     * allowing pages to be drawn at their calculated positions.
     */
    private fun drawPages(canvas: Canvas) {
        if (!isActive()) return

        val visiblePages = context.layoutCalculator.getVisiblePages()

        canvas.withTranslation(-context.scrollHandler.scrollX, -context.scrollHandler.scrollY) {
            context.cacheManager.withSynchronizedCache {
                visiblePages.forEach { pageNum ->
                    drawPage(this, pageNum)
                }
            }
        }
    }
}
