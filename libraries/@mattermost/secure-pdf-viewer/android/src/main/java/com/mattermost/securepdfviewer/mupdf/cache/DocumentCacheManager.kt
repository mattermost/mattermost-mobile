package com.mattermost.securepdfviewer.mupdf.cache

import android.util.Log
import com.artifex.mupdf.fitz.Document
import java.util.concurrent.ConcurrentHashMap

/**
 * Thread-safe cache manager for document metadata and page information.
 *
 * This class manages caching of frequently accessed document metadata to improve
 * performance by avoiding expensive native MuPDF calls. It provides thread-safe
 * operations and automatic cache invalidation when needed.
 *
 * Cached data includes:
 * - Page count for the document
 * - Individual page sizes and dimensions
 * - Other document metadata as needed
 *
 * The cache is designed to be lightweight and memory-efficient while providing
 * significant performance improvements for document operations.
 */
internal class DocumentCacheManager {

    companion object {
        private const val TAG = "DocumentCacheManager"
    }

    // Performance optimization caches
    private val pageSizeCache = ConcurrentHashMap<Int, Pair<Float, Float>>()
    private var pageCountCache: Int? = null

    /**
     * Gets the total number of pages in the document with caching for performance.
     *
     * This method provides thread-safe access to the document's page count, utilizing
     * an internal cache to avoid repeated expensive native calls. The page count is
     * cached after the first successful retrieval and reused for subsequent calls.
     *
     * @param document The MuPDF Document instance to query
     * @return Total number of pages in the document, or 0 if document is invalid
     */
    fun getPageCount(document: Document): Int {
        return try {
            val cache = pageCountCache
            if (cache != null) {
                return cache
            }
            val count = document.countPages()
            if (count < 0) {
                Log.w(TAG, "Invalid page count: $count")
                0
            } else {
                Log.d(TAG, "Document has $count pages")
                pageCountCache = count
                count
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting page count", e)
            0
        }
    }

    /**
     * Gets the size of a specific page without loading the full page object.
     *
     * This method provides efficient access to page dimensions by utilizing a cache
     * to store previously retrieved page sizes. This is significantly more efficient
     * than loading the entire page object when only size information is needed.
     *
     * The returned dimensions are in PDF coordinate units (typically 72 DPI points)
     * and represent the page's natural size before any scaling or transformations.
     *
     * @param document The MuPDF Document instance to query
     * @param pageNumber 0-based page index to retrieve size for
     * @param pageCount Total page count for validation (cached value)
     * @return Pair of (width, height) in PDF coordinate units, or null if invalid page
     */
    fun getPageSize(document: Document, pageNumber: Int, pageCount: Int): Pair<Float, Float>? {
        if (pageCount <= 0 || pageNumber < 0 || pageNumber >= pageCount) {
            Log.w(TAG, "Invalid page number: $pageNumber (count: $pageCount)")
            return null
        }

        // Check cache first for performance
        pageSizeCache[pageNumber]?.let { cachedSize ->
            return cachedSize
        }

        // Load page to get size and cache the result
        return try {
            val page = document.loadPage(pageNumber)
            val bounds = page.bounds
            val size = Pair(bounds.x1 - bounds.x0, bounds.y1 - bounds.y0)
            page.destroy()

            pageSizeCache[pageNumber] = size
            Log.d(TAG, "Page $pageNumber size cached: ${size.first}x${size.second}")

            size
        } catch (e: Exception) {
            Log.e(TAG, "Error getting page $pageNumber size", e)
            null
        }
    }

    /**
     * Clears all cached data and frees associated memory.
     *
     * This method should be called when the document is being destroyed or when
     * cache invalidation is needed. It is thread-safe and can be called multiple
     * times without side effects.
     */
    fun clearCache() {
        pageCountCache = null
        pageSizeCache.clear()
        Log.d(TAG, "Document cache cleared")
    }
}
