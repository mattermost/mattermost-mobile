package com.mattermost.helpers

import android.graphics.Bitmap
import android.util.LruCache

class BitmapCache {
    private var memoryCache: LruCache<String, Bitmap>
    private var keysCache: LruCache<String, String>

    init {
        val maxMemory = (Runtime.getRuntime().maxMemory() / 1024).toInt()
        val cacheSize = maxMemory / 8
        memoryCache = object : LruCache<String, Bitmap>(cacheSize) {
            override fun sizeOf(key: String, bitmap: Bitmap): Int {
                return bitmap.byteCount / 1024
            }
        }
        keysCache = LruCache<String, String>(50)
    }

    fun bitmap(userId: String, updatedAt: Double, serverUrl: String): Bitmap? {
        val key = "$serverUrl-$userId-$updatedAt"
        return memoryCache.get(key)
    }

    fun insertBitmap(bitmap: Bitmap?, userId: String, updatedAt: Double, serverUrl: String) {
        if (bitmap == null) {
            removeBitmap(userId, serverUrl)
        }
        val key = "$serverUrl-$userId-$updatedAt"
        val cachedKey = "$serverUrl-$userId"
        keysCache.put(cachedKey, key)
        memoryCache.put(key, bitmap)
    }

    fun removeBitmap(userId: String, serverUrl: String) {
        val cachedKey = "$serverUrl-$userId"
        val key = keysCache.get(cachedKey)
        if (key != null) {
            memoryCache.remove(key)
            keysCache.remove(cachedKey)
        }
    }

    fun removeAllBitmaps() {
        memoryCache.evictAll()
        keysCache.evictAll()
    }
}
