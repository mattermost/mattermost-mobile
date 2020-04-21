package com.mattermost.share

import android.content.Context
import android.database.Cursor
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.DocumentsContract
import android.provider.MediaStore
import android.provider.OpenableColumns
import android.text.TextUtils
import android.util.Log
import android.webkit.MimeTypeMap
import com.mattermost.share.ShareModule
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.IOException

// Class based on the steveevers DocumentHelper https://gist.github.com/steveevers/a5af24c226f44bb8fdc3
object RealPathUtil {
    fun getRealPathFromURI(context: Context, uri: Uri): String? {
        val isKitKatOrNewer = Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT
        // DocumentProvider
        if (isKitKatOrNewer && DocumentsContract.isDocumentUri(context, uri)) { // ExternalStorageProvider
            if (isExternalStorageDocument(uri)) {
                val docId = DocumentsContract.getDocumentId(uri)
                val split = docId.split(":").toTypedArray()
                val type = split[0]
                if ("primary".equals(type, ignoreCase = true)) {
                    return Environment.getExternalStorageDirectory().toString() + "/" + split[1]
                }
            } else if (isDownloadsDocument(uri)) { // DownloadsProvider
                val id = DocumentsContract.getDocumentId(uri)
                if (!TextUtils.isEmpty(id)) {
                    return if (id.startsWith("raw:")) {
                        id.replaceFirst("raw:".toRegex(), "")
                    } else try {
                        getPathFromSavingTempFile(context, uri)
                    } catch (e: NumberFormatException) {
                        Log.e("ReactNative", "DownloadsProvider unexpected uri $uri")
                        null
                    }
                }
            } else if (isMediaDocument(uri)) { // MediaProvider
                val docId = DocumentsContract.getDocumentId(uri)
                val split = docId.split(":").toTypedArray()
                val type = split[0]
                var contentUri: Uri? = null
                if ("image" == type) {
                    contentUri = MediaStore.Images.Media.EXTERNAL_CONTENT_URI
                } else if ("video" == type) {
                    contentUri = MediaStore.Video.Media.EXTERNAL_CONTENT_URI
                } else if ("audio" == type) {
                    contentUri = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
                }
                val selection = "_id=?"
                val selectionArgs = arrayOf(
                        split[1]
                )
                return getDataColumn(context, contentUri, selection, selectionArgs)
            }
        }
        if ("content".equals(uri.scheme, ignoreCase = true)) { // MediaStore (and general)
            return if (isGooglePhotosUri(uri)) {
                uri.lastPathSegment
            } else getPathFromSavingTempFile(context, uri)
            // Try save to tmp file, and return tmp file path
        } else if ("file".equals(uri.scheme, ignoreCase = true)) {
            return uri.path
        }
        return null
    }

    fun getPathFromSavingTempFile(context: Context, uri: Uri): String? {
        val tmpFile: File
        var fileName: String? = null
        // Try and get the filename from the Uri
        try {
            val returnCursor = context.contentResolver.query(uri, null, null, null, null)
            val nameIndex = returnCursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            returnCursor.moveToFirst()
            fileName = returnCursor.getString(nameIndex)
        } catch (e: Exception) { // just continue to get the filename with the last segment of the path
        }
        try {
            if (fileName == null) {
                fileName = uri.lastPathSegment.toString().trim { it <= ' ' }
            }
            val cacheDir = File(context.cacheDir, ShareModule.CACHE_DIR_NAME)
            if (!cacheDir.exists()) {
                cacheDir.mkdirs()
            }
            tmpFile = File(cacheDir, fileName)
            tmpFile.createNewFile()
            val pfd = context.contentResolver.openFileDescriptor(uri, "r")
            val src = FileInputStream(pfd.fileDescriptor).channel
            val dst = FileOutputStream(tmpFile).channel
            dst.transferFrom(src, 0, src.size())
            src.close()
            dst.close()
        } catch (ex: IOException) {
            return null
        }
        return tmpFile.absolutePath
    }

    fun getDataColumn(context: Context, uri: Uri?, selection: String?,
                      selectionArgs: Array<String>?): String? {
        var cursor: Cursor? = null
        val column = "_data"
        val projection = arrayOf(
                column
        )
        try {
            cursor = context.contentResolver.query(uri, projection, selection, selectionArgs,
                    null)
            if (cursor != null && cursor.moveToFirst()) {
                val index = cursor.getColumnIndexOrThrow(column)
                return cursor.getString(index)
            }
        } finally {
            cursor?.close()
        }
        return null
    }

    fun isExternalStorageDocument(uri: Uri) = "com.android.externalstorage.documents" == uri.authority
    fun isDownloadsDocument(uri: Uri) = "com.android.providers.downloads.documents" == uri.authority
    fun isMediaDocument(uri: Uri) = "com.android.providers.media.documents" == uri.authority
    fun isGooglePhotosUri(uri: Uri) = "com.google.android.apps.photos.content" == uri.authority

    fun getExtension(uri: String?): String? {
        if (uri == null) {
            return null
        }
        val dot = uri.lastIndexOf(".")
        return if (dot >= 0) {
            uri.substring(dot)
        } else { // No extension.
            ""
        }
    }

    fun getMimeType(file: File): String {
        val extension = getExtension(file.name)
        return if (extension!!.length > 0) MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension.substring(1)) else "application/octet-stream"
    }

    fun getMimeType(filePath: String?): String {
        val file = File(filePath)
        return getMimeType(file)
    }

    fun getMimeTypeFromUri(context: Context, uri: Uri?): String {
        return try {
            val cR = context.contentResolver
            cR.getType(uri)
        } catch (e: Exception) {
            "application/octet-stream"
        }
    }

    @JvmStatic
    fun deleteTempFiles(dir: File) {
        try {
            if (dir.isDirectory) {
                deleteRecursive(dir)
            }
        } catch (e: Exception) { // do nothing
        }
    }

    private fun deleteRecursive(fileOrDirectory: File) {
        if (fileOrDirectory.isDirectory) for (child in fileOrDirectory.listFiles()) deleteRecursive(child)
        fileOrDirectory.delete()
    }
}
