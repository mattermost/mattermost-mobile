package com.mattermost.rnshare.helpers

import android.content.Context
import android.net.Uri
import android.provider.DocumentsContract
import android.provider.OpenableColumns
import android.text.TextUtils
import android.util.Log
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.IOException

object RealPathUtil {
    const val CACHE_DIR_NAME: String = "mmShare"

    init {
        deleteTempFiles(File(CACHE_DIR_NAME))
    }

    fun getRealPathFromURI(context:Context, uri:Uri?): String? {
        if (uri == null) {
            return null
        }
        // DocumentProvider
        if (DocumentsContract.isDocumentUri(context, uri)) {
            // ExternalStorageProvider
            if (isExternalStorageDocument(uri)) {
                val docId = DocumentsContract.getDocumentId(uri)
                val split = docId.split((":").toRegex()).dropLastWhile { it.isEmpty() }.toTypedArray()
                val type = split[0]
                if ("primary".equals(type, ignoreCase = true)) {
                    return context.getExternalFilesDir(split[1])?.absolutePath
                }
            } else if (isDownloadsDocument(uri)) {
                // DownloadsProvider
                val id = DocumentsContract.getDocumentId(uri)
                if (!TextUtils.isEmpty(id)) {
                    if (id.startsWith("raw:")) {
                        return id.replaceFirst(("raw:").toRegex(), "")
                    }

                    try {
                        return getPathFromSavingTempFile(context, uri)
                    } catch (e:NumberFormatException) {
                        Log.e("ReactNative", "DownloadsProvider unexpected uri $uri")
                        return null
                    }
                }
            }
            else if (isMediaDocument(uri)) {
                // MediaProvider
                return getPathFromSavingTempFile(context, uri)
            }
        }
        if ("content".equals(uri.scheme, ignoreCase = true)) {
            // MediaStore (and general)
            if (isGooglePhotosUri(uri)) {
                return uri.lastPathSegment
            }
            // Try save to tmp file, and return tmp file path
            return getPathFromSavingTempFile(context, uri)
        }
        else if ("file".equals(uri.scheme, ignoreCase = true)) {
            return uri.path
        }
        return null
    }

    private fun getPathFromSavingTempFile(context:Context, uri:Uri): String? {
        val tmpFile:File
        var fileName: String? = null
        // Try and get the filename from the Uri
        try
        {
            val returnCursor = context.contentResolver.query(uri, null, null, null, null)
            val nameIndex = returnCursor?.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            returnCursor?.moveToFirst()
            fileName = sanitizeFilename(nameIndex?.let { returnCursor.getString(it) })
            returnCursor?.close()
        } catch (e:Exception) {
            // just continue to get the filename with the last segment of the path
        }

        try
        {
            if (fileName == null) {
                fileName = sanitizeFilename(uri.lastPathSegment.toString().trim())
            }
            val cacheDir = File(context.cacheDir, CACHE_DIR_NAME)
            if (!cacheDir.exists()) {
                cacheDir.mkdirs()
            }
            tmpFile = File(cacheDir, fileName!!)
            tmpFile.createNewFile()
            val pfd = context.contentResolver.openFileDescriptor(uri, "r")
            val src = FileInputStream(pfd?.fileDescriptor).channel
            val dst = FileOutputStream(tmpFile).channel
            dst.transferFrom(src, 0, src.size())
            src.close()
            dst.close()
            pfd?.close()
        }
        catch (ex:IOException) {
            return null
        }
        return tmpFile.absolutePath
    }

    private fun sanitizeFilename(filename: String?): String? {
        if (filename == null) {
            return null
        }

        val f = File(filename)
        return f.name
    }

    private fun isExternalStorageDocument(uri:Uri):Boolean {
        return "com.android.externalstorage.documents" == uri.authority
    }

    private fun isDownloadsDocument(uri:Uri):Boolean {
        return "com.android.providers.downloads.documents" == uri.authority
    }

    private fun isMediaDocument(uri:Uri):Boolean {
        return "com.android.providers.media.documents" == uri.authority
    }

    private fun isGooglePhotosUri(uri:Uri):Boolean {
        return "com.google.android.apps.photos.content" == uri.authority
    }

    fun getExtension(uri: String?): String? {
        if (uri == null) {
            return null
        }

        val dot = uri.lastIndexOf(".")
        return if (dot >= 0)
        {
            uri.substring(dot)
        } else {
            // No extension.
            ""
        }
    }

    fun getMimeTypeFromUri(context: Context, uri: Uri): String? {
        try {
            val cR = context.contentResolver
            return cR.getType(uri)
        } catch (e: java.lang.Exception) {
            return "application/octet-stream"
        }
    }

    fun deleteTempFiles(dir: File) {
        try
        {
            if (dir.isDirectory) {
                deleteRecursive(dir)
            }
        }
        catch (e:Exception) {
            // do nothing
        }
    }

    private fun deleteRecursive(fileOrDirectory:File) {
        if (fileOrDirectory.isDirectory) {
            val files = fileOrDirectory.listFiles()
            if (files?.size!! > 0) {
                for (child in files) {
                    deleteRecursive(child)
                }
            }
            fileOrDirectory.delete()
        }
    }
}
