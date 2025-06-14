package com.mattermost.securepdfviewer.pdfium.cache

import android.graphics.Bitmap
import android.util.Log
import com.mattermost.pdfium.model.PdfLink
import java.util.concurrent.ConcurrentHashMap

/**
 * Manages caching for PDF document rendering and metadata.
 *
 * Responsibilities include:
 * - Caching rendered bitmaps per page
 * - Caching extracted links per page
 * - Caching page sizes and offsets for layout calculations
 * - Caching page count for document-level information
 * - Providing thread-safe access to cache data
 */
class PdfCacheManager {

    companion object {
        private const val TAG = "PdfCacheManager"
    }

    // Private caches
    private var pageCount: Int? = null
    private val pageSizes = mutableMapOf<Int, Pair<Float, Float>>()
    private val pageOffsets = mutableMapOf<Int, Float>()
    private var lastVisiblePages = emptyList<Int>()
    private val pageCache = mutableMapOf<Int, Bitmap>()
    private val linkCache = ConcurrentHashMap<Int, List<PdfLink>>()
    private val cacheAccessLock = Any()

    /**
     * Gets the cached page count.
     *
     * @return Cached page count or null if not set.
     */
    fun getPageCount(): Int? = pageCount

    /**
     * Sets the cached page count.
     *
     * @param count Total page count to cache.
     */
    fun setPageCount(count: Int) {
        pageCount = count
    }

    /**
     * Gets the cached page size for a specific page.
     *
     * @param pageNum Page number.
     * @return Cached size (width, height) or null if not cached.
     */
    fun getPageSize(pageNum: Int): Pair<Float, Float>? = pageSizes[pageNum]

    /**
     * Sets the cached page size for a specific page.
     *
     * @param pageNum Page number.
     * @param size Pair of (width, height).
     */
    fun setPageSize(pageNum: Int, size: Pair<Float, Float>) {
        pageSizes[pageNum] = size
    }

    /**
     * Clears all page sizes in the cache
     */
    fun clearPageSizes() {
        pageSizes.clear()
    }

    /**
     * Gets all page sizes in the cache
     */
    fun getPageSizes() = pageSizes

    /**
     * Gets the maximum page width from all pages in the document.
     */
    fun getMaxPageWidth(): Float = pageSizes.values.maxOfOrNull { it.first } ?: 0f

    /**
     * Gets the cached page offset for a specific page.
     *
     * @param pageNum Page number.
     * @return Cached offset or null if not cached.
     */
    fun getPageOffset(pageNum: Int): Float? = pageOffsets[pageNum]

    /**
     * Sets the cached page offset for a specific page.
     *
     * @param pageNum Page number.
     * @param offset Page offset.
     */
    fun setPageOffset(pageNum: Int, offset: Float) {
        pageOffsets[pageNum] = offset
    }

    /**
     * Clears all page offsets
     */
    fun clearPageOffsets() {
        pageOffsets.clear()
    }

    /**
     * Gets the cached page offsets
     *
     * @return Cached list of page offsets cached.
     */
    fun getPageOffsets(): Map<Int, Float> = pageOffsets

    /**
     * Gets the cached list of last visible pages.
     *
     * @return List of last visible pages.
     */
    fun getLastVisiblePages(): List<Int> = lastVisiblePages.toList()

    /**
     * Sets the list of last visible pages.
     *
     * @param pages List of page numbers.
     */
    fun setLastVisiblePages(pages: List<Int>) {
        lastVisiblePages = pages.toList()
    }

    /**
     * Caches a rendered bitmap for a specific page.
     *
     * @param pageNum Page number.
     * @param bitmap Rendered bitmap.
     */
    fun cachePage(pageNum: Int, bitmap: Bitmap?) {
        withSynchronizedCache {
            pageCache[pageNum]?.recycle()
            if (bitmap != null) {
                pageCache[pageNum] = bitmap
            } else {
                pageCache.remove(pageNum)
            }
        }
        Log.d(TAG, "Page $pageNum cached")
    }

    /**
     * Retrieves a cached bitmap for a specific page.
     *
     * @param pageNum Page number.
     * @return Cached bitmap or null if not cached.
     */
    fun getCachedPage(pageNum: Int): Bitmap? = withSynchronizedCache { pageCache[pageNum] }

    /**
     *
     */
    fun clearNonVisiblePages(visible: List<Int>) {
        withSynchronizedCache {
            val toRemove = pageCache.keys.filter { it !in visible }

            toRemove.forEach { pageNum ->
                pageCache[pageNum]?.recycle()
                pageCache.remove(pageNum)
            }

            Log.d(TAG, "Cleared ${toRemove.size} pages, kept ${visible.size} visible pages")
        }
    }

    /**
     * Caches extracted links for a specific page.
     *
     * @param pageNum Page number.
     * @param links List of PdfLink objects.
     */
    fun cacheLinks(pageNum: Int, links: List<PdfLink>) {
        if (!linkCache.contains(pageNum)) {
            linkCache[pageNum] = links
            Log.d(TAG, "Links for page $pageNum cached")
        }
    }

    /**
     * Retrieves cached links for a specific page.
     *
     * @param pageNum Page number.
     * @return Cached list of PdfLink objects, or null if not cached.
     */
    fun getCachedLinks(pageNum: Int): List<PdfLink>? = linkCache[pageNum]

    /**
     * Utility method to perform actions within the synchronized cache lock.
     *
     * @param action Callback to execute inside synchronized block.
     * @return Result of the action.
     */
    fun <T> withSynchronizedCache(action: () -> T): T {
        synchronized(cacheAccessLock) {
            return action()
        }
    }

    /**
     * Clears all cached data, including bitmaps, sizes, offsets, and links.
     */
    fun cleanup() {
        Log.d(TAG, "Cache cleanup started")

        withSynchronizedCache {
            pageCache.values.forEach { bitmap ->
                if (!bitmap.isRecycled) {
                    bitmap.recycle()
                }
            }
            pageCache.clear()
            pageSizes.clear()
            pageOffsets.clear()
        }

        lastVisiblePages = emptyList()
        linkCache.clear()
        pageCount = null

        Log.d(TAG, "Cache cleanup completed")
    }
}
