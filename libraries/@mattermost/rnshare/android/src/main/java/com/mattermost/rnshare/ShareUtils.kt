package com.mattermost.rnshare

import android.app.Activity
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.webkit.URLUtil
import androidx.core.net.toUri
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.mattermost.rnshare.helpers.RealPathUtil
import java.io.File
import java.io.FileOutputStream
import java.io.OutputStream
import java.io.UnsupportedEncodingException
import java.net.URLDecoder
import java.util.UUID

object ShareUtils {
    fun getTextItem(text: String?): ReadableMap {
        val map = Arguments.createMap()
        map.putString("value", text)
        map.putString("type", "")
        map.putBoolean("isString", true)
        return map
    }

    fun getFileItem(activity: Activity, uri: Uri): ReadableMap? {
        val map = Arguments.createMap()
        val filePath: String = RealPathUtil.getRealPathFromURI(activity, uri)
                ?: return null

        val file = File(filePath)
        var type = RealPathUtil.getMimeTypeFromUri(activity, uri)
        if (type?.startsWith("image/") == true) {
            val bitMapOption = getImageDimensions(filePath)
            map.putInt("height", bitMapOption.outHeight)
            map.putInt("width", bitMapOption.outWidth)
        } else if (type?.startsWith("video/") == true) {
            val cacheDir = File(activity.cacheDir, RealPathUtil.CACHE_DIR_NAME)
            addVideoThumbnailToMap(cacheDir, activity.applicationContext, map, "file://$filePath")
        } else {
            type = "application/octet-stream"
        }

        map.putString("value", "file://$filePath")
        map.putDouble("size", file.length().toDouble())
        map.putString("filename", file.name)
        map.putString("type", type)
        map.putString("extension", RealPathUtil.getExtension(filePath)?.replaceFirst(".".toRegex(), "") ?: "")
        map.putBoolean("isString", false)
        return map
    }

    private fun getImageDimensions(filePath: String): BitmapFactory.Options {
        val bitMapOption = BitmapFactory.Options()
        bitMapOption.inJustDecodeBounds = true
        BitmapFactory.decodeFile(filePath, bitMapOption)
        return bitMapOption
    }

    private fun addVideoThumbnailToMap(cacheDir: File, context: Context, map: WritableMap, filePath: String) {
        val fileName = ("thumb-" + UUID.randomUUID().toString()) + ".png"
        val fOut: OutputStream?

        try {
            val file = File(cacheDir, fileName)
            val image = getBitmapAtTime(context, filePath)
            if (file.createNewFile()) {
                fOut = FileOutputStream(file)
                image!!.compress(Bitmap.CompressFormat.PNG, 100, fOut)
                fOut.flush()
                fOut.close()

                map.putString("videoThumb", "file://" + file.absolutePath)
                map.putInt("width", image.width)
                map.putInt("height", image.height)
            }
        } catch (ignored: Exception) {
        }
    }

    private fun getBitmapAtTime(context: Context, filePath: String): Bitmap? {
        try {
            val time = 1
            val retriever = MediaMetadataRetriever()
            if (URLUtil.isFileUrl(filePath)) {
                val decodedPath = try {
                    URLDecoder.decode(filePath, "UTF-8")
                } catch (e: UnsupportedEncodingException) {
                    filePath
                }

                retriever.setDataSource(decodedPath.replace("file://", ""))
            } else if (filePath.contains("content://")) {
                retriever.setDataSource(context, filePath.toUri())
            }

            val image = retriever.getFrameAtTime((time * 1000).toLong(), MediaMetadataRetriever.OPTION_CLOSEST_SYNC)
            retriever.release()
            return image
        } catch (e: Exception) {
            throw IllegalStateException("File doesn't exist or not supported")
        }
    }
}
