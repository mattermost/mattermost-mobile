package com.mattermost.securepdfviewer.mupdf.cache

import android.graphics.Bitmap
import android.util.Log
import com.mattermost.securepdfviewer.mupdf.MuPDFView

/**
 * Manages bitmap caching and memory optimization for PDF page rendering.
 *
 * This class handles:
 * - Multi-page bitmap caching with thread-safe operations
 * - Memory constraint management to prevent crashes
 * - Intelligent cache cleanup strategies
 * - Page size caching for layout calculations
 * - Cache validation and lifecycle management
 *
 * The cache manager balances memory usage with user experience by maintaining
 * visible pages in cache while clearing distant pages to free memory.
 */
internal class PageCacheManager(private val view: MuPDFView) {

    companion object {
        private const val TAG = "CacheManager"
        private const val PRELOAD_RADIUS = 2 // pages to preload around the current page
    }

    // Multi-page caching system - exposed directly for performance
    var cachedBitmap: Bitmap? = null
    val pageSizes = mutableMapOf<Int, Pair<Float, Float>>()
    val pageOffsets = mutableMapOf<Int, Float>()
    private val pageCache = mutableMapOf<Int, Bitmap>()
    private var lastVisiblePages = emptyList<Int>()

    // Thread safety for cache operations
    val cacheAccessLock = Any()

    // Cache operations

    /**
     * Adds a rendered bitmap to the cache.
     *
     * @param pageNum Page number
     * @param bitmap Rendered bitmap
     */
    fun cachePage(pageNum: Int, bitmap: Bitmap) {
        synchronized(cacheAccessLock) {
            pageCache[pageNum] = bitmap
        }
        Log.d(TAG, "Page $pageNum cached")
    }

    /**
     * Gets a cached bitmap for a specific page.
     *
     * @param pageNum Page number
     * @return Cached bitmap or null if not cached
     */
    fun getCachedPage(pageNum: Int): Bitmap? {
        return synchronized(cacheAccessLock) {
            pageCache[pageNum]
        }
    }

    /**
     * Checks if a specific page is already cached and valid.
     *
     * @param pageNum Page number to check
     * @return true if page is cached and bitmap is not recycled
     */
    private fun isPageCached(pageNum: Int): Boolean {
        synchronized(cacheAccessLock) {
            val bitmap = pageCache[pageNum]
            return bitmap != null && !bitmap.isRecycled
        }
    }

    // Cache management

    /**
     * Manages cache for visible pages and preloading.
     *
     * This method orchestrates the cache management system:
     * - Identifies currently visible pages
     * - Triggers rendering for uncached visible pages
     * - Preloads adjacent pages for smooth scrolling
     * - Updates tracking of visible pages to reduce logging spam
     */
    fun manageCache() {
        val doc = view.document ?: return

        // Skip cache management during zoom animation to prevent flickering
        if (view.zoomAnimator.isZooming) {
            return
        }

        if (!doc.isValid() || view.isViewDestroyed() || !view.isViewReady()) {
            Log.d(TAG, "Cannot manage cache: valid=${doc.isValid()}, destroyed=${view.isViewDestroyed()}, ready=${view.isViewReady()}")
            return
        }

        val visiblePages = view.layoutCalculator.getVisiblePages()

        if (visiblePages.isEmpty()) {
            Log.w(TAG, "No visible pages found - scrollY=${view.scrollHandler.scrollY}, totalHeight=${view.scrollHandler.totalDocumentHeight}, viewHeight=${view.height}")
            Log.w(TAG, "Page offsets size: ${pageOffsets.size}, Page sizes size: ${pageSizes.size}")
        }

        // Log visible pages changes to reduce spam
        if (visiblePages != lastVisiblePages) {
            Log.d(TAG, "Managing cache for visible pages: $visiblePages")
            lastVisiblePages = visiblePages.toList()
        }

        // Start render jobs for visible pages that aren't cached
        visiblePages.forEach { pageNum ->
            if (!isPageCached(pageNum) && !view.pageRenderer.isRenderInProgress.get()) {
                view.pageRenderer.renderPage(pageNum)
            }
        }

        // Preload adjacent pages for smooth scrolling
        val currentPageNum = view.layoutCalculator.getCurrentVisiblePage()
        for (i in 1..PRELOAD_RADIUS) {
            val prevPage = currentPageNum - i
            val nextPage = currentPageNum + i

            if (prevPage >= 0 && !isPageCached(prevPage)) {
                view.pageRenderer.renderPage(prevPage)
            }
            if (nextPage < doc.getPageCount() && !isPageCached(nextPage)) {
                view.pageRenderer.renderPage(nextPage)
            }
        }
    }

    /**
     * Intelligently clears and re-renders pages after zoom changes.
     *
     * Maintains visible pages in cache while clearing distant pages
     * to balance memory usage with user experience.
     */
    fun clearAndRerenderPages() {
        try {
            val visiblePages = view.layoutCalculator.getVisiblePages()

            synchronized(cacheAccessLock) {
                val toKeep = visiblePages.toSet()
                val toRemove = pageCache.keys.filter { it !in toKeep }

                toRemove.forEach { pageNum ->
                    pageCache[pageNum]?.recycle()
                    pageCache.remove(pageNum)
                }

                Log.d(TAG, "Cleared ${toRemove.size} pages, kept ${toKeep.size} visible pages")
            }

            manageCache()
            view.invalidate()

        } catch (e: Exception) {
            Log.e(TAG, "Error in smart cache clearing", e)
        }
    }

    /**
     * Pre-calculates and caches all page sizes for efficient layout operations.
     *
     * This optimization prevents repeated MuPDF calls during scrolling and zoom operations
     * by loading all page dimensions once during document initialization.
     */
    fun preCalculateAllPageSizes() {
        val doc = view.document ?: return

        try {
            val pageCount = doc.getPageCount()

            synchronized(cacheAccessLock) {
                pageSizes.clear()

                for (i in 0 until pageCount) {
                    val pageSize = doc.getPageSize(i)
                    if (pageSize != null) {
                        pageSizes[i] = pageSize
                    }
                }
            }

            Log.d(TAG, "Pre-calculated ${pageSizes.size} page sizes")
        } catch (e: Exception) {
            Log.e(TAG, "Error pre-calculating page sizes", e)
        }
    }

    /**
     * Safely cleans up all cached resources.
     *
     * Recycles all cached bitmaps and clears all cache maps to prevent memory leaks.
     */
    fun cleanup() {
        Log.d(TAG, "Cache cleanup started")

        // Clean up all cached bitmaps
        synchronized(cacheAccessLock) {
            pageCache.values.forEach { bitmap ->
                if (!bitmap.isRecycled) {
                    bitmap.recycle()
                }
            }
            pageCache.clear()
            pageSizes.clear()
            pageOffsets.clear()
        }

        // Clean up legacy cache
        cachedBitmap?.let { bitmap ->
            if (!bitmap.isRecycled) {
                bitmap.recycle()
            }
        }
        cachedBitmap = null

        lastVisiblePages = emptyList()

        Log.d(TAG, "Cache cleanup completed")
    }
}
