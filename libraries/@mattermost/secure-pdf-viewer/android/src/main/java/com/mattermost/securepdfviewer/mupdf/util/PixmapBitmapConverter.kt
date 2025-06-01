package com.mattermost.securepdfviewer.mupdf.util

import android.graphics.Bitmap
import android.graphics.Bitmap.createBitmap
import android.util.Log
import com.artifex.mupdf.fitz.Pixmap
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Utility class for converting MuPDF Pixmap objects to Android Bitmap format.
 *
 * This class handles the complex process of converting MuPDF native pixmap
 * format to Android's Bitmap format, supporting multiple color spaces and
 * ensuring proper color channel ordering for Android's ARGB format.
 *
 * Supports conversion from:
 * - RGB (3 components) pixmaps to ARGB bitmaps
 * - RGBA (4 components) pixmaps to ARGB bitmaps with alpha preservation
 * - Fallback handling for unsupported formats
 */
internal object PixmapBitmapConverter {

    private const val TAG = "PixmapBitmapConverter"

    /**
     * Converts a MuPDF Pixmap to an Android Bitmap with optimized color handling.
     *
     * This method handles the complex process of converting MuPDF native pixmap
     * format to Android's Bitmap format, supporting multiple color spaces and
     * ensuring proper color channel ordering for Android's ARGB format.
     *
     * @param pixmap The MuPDF Pixmap to convert (will be destroyed by caller)
     * @return Android Bitmap in ARGB_8888 format, or null if conversion fails
     */
    suspend fun convertPixmapToBitmap(pixmap: Pixmap): Bitmap? = withContext(Dispatchers.Default) {
        try {
            val width = pixmap.width
            val height = pixmap.height
            val samples = pixmap.samples
            val stride = pixmap.stride
            val componentCount = pixmap.numberOfComponents

            // Validate pixmap data integrity
            if (width <= 0 || height <= 0 || samples == null || samples.isEmpty()) {
                Log.e(TAG, "Invalid pixmap: ${width}x${height}, samples=${samples?.size}")
                return@withContext null
            }

            Log.d(TAG, "Converting pixmap: ${width}x${height}, stride: $stride, components: $componentCount")

            return@withContext when (componentCount) {
                3 -> createRGBBitmap(width, height, samples, stride)
                4 -> createRGBABitmap(width, height, samples, stride)
                else -> {
                    Log.w(TAG, "Unsupported component count: $componentCount")
                    createBitmap(width, height, Bitmap.Config.RGB_565).apply {
                        eraseColor(android.graphics.Color.WHITE)
                    }
                }
            }

        } catch (e: Exception) {
            Log.e(TAG, "Error converting pixmap to bitmap", e)
            null
        }
    }

    /**
     * Creates an Android bitmap from RGB pixmap data with proper color channel ordering.
     *
     * Converts 24-bit RGB data from MuPDF to Android's 32-bit ARGB format,
     * ensuring proper color representation and handling edge cases like
     * out-of-bounds pixel data.
     *
     * @param width Bitmap width in pixels
     * @param height Bitmap height in pixels
     * @param samples Raw RGB pixel data from MuPDF (3 bytes per pixel)
     * @param stride Number of bytes per row in the source data
     * @return Android Bitmap in ARGB_8888 format, or null if creation fails
     */
    private fun createRGBBitmap(width: Int, height: Int, samples: ByteArray, stride: Int): Bitmap? {
        return try {
            val pixels = IntArray(width * height)
            var pixelIndex = 0

            for (y in 0 until height) {
                for (x in 0 until width) {
                    val sampleOffset = (y * stride) + (x * 3)

                    if (sampleOffset + 2 < samples.size) {
                        // Extract RGB components and convert to Android ARGB format
                        val r = samples[sampleOffset].toInt() and 0xFF
                        val g = samples[sampleOffset + 1].toInt() and 0xFF
                        val b = samples[sampleOffset + 2].toInt() and 0xFF

                        // Android ARGB format: 0xAARRGGBB (alpha = 0xFF for opaque)
                        pixels[pixelIndex] = (0xFF shl 24) or (r shl 16) or (g shl 8) or b
                    } else {
                        // Default to white for out-of-bounds pixels
                        pixels[pixelIndex] = 0xFFFFFFFF.toInt()
                    }
                    pixelIndex++
                }
            }

            createBitmap(pixels, width, height, Bitmap.Config.ARGB_8888)

        } catch (e: Exception) {
            Log.e(TAG, "Error creating RGB bitmap", e)
            null
        }
    }

    /**
     * Creates an Android bitmap from RGBA pixmap data with alpha channel support.
     *
     * Converts 32-bit RGBA data from MuPDF to Android's ARGB format, preserving
     * transparency information and handling proper alpha blending.
     *
     * @param width Bitmap width in pixels
     * @param height Bitmap height in pixels
     * @param samples Raw RGBA pixel data from MuPDF (4 bytes per pixel)
     * @param stride Number of bytes per row in the source data
     * @return Android Bitmap in ARGB_8888 format, or null if creation fails
     */
    private fun createRGBABitmap(width: Int, height: Int, samples: ByteArray, stride: Int): Bitmap? {
        return try {
            val pixels = IntArray(width * height)
            var pixelIndex = 0

            for (y in 0 until height) {
                for (x in 0 until width) {
                    val sampleOffset = (y * stride) + (x * 4)

                    if (sampleOffset + 3 < samples.size) {
                        // Extract RGBA components and convert to Android ARGB format
                        val r = samples[sampleOffset].toInt() and 0xFF
                        val g = samples[sampleOffset + 1].toInt() and 0xFF
                        val b = samples[sampleOffset + 2].toInt() and 0xFF
                        val a = samples[sampleOffset + 3].toInt() and 0xFF

                        // Android ARGB format: 0xAARRGGBB
                        pixels[pixelIndex] = (a shl 24) or (r shl 16) or (g shl 8) or b
                    } else {
                        // Default to opaque white for out-of-bounds pixels
                        pixels[pixelIndex] = 0xFFFFFFFF.toInt()
                    }
                    pixelIndex++
                }
            }

            createBitmap(pixels, width, height, Bitmap.Config.ARGB_8888)

        } catch (e: Exception) {
            Log.e(TAG, "Error creating RGBA bitmap", e)
            null
        }
    }
}
