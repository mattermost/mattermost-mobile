package com.mattermost.rnutils.helpers

import android.content.ContentResolver
import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import android.util.Log
import android.webkit.MimeTypeMap
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.util.UUID

const val CACHE_DIR_NAME: String = "mmShare"

private val UNSAFE_FILENAME_CHARS = Regex("""[%\\\p{Cntrl}]""")

object RealPathUtil {
    init {
        deleteTempFiles(File(CACHE_DIR_NAME))
    }

    fun getRealPathFromURI(context: Context, uri: Uri?): String? {
        if (uri == null) {
            return null
        }

        return when (uri.scheme?.lowercase()) {
            ContentResolver.SCHEME_CONTENT -> {
                if (isOwnProvider(context, uri)) {
                    Log.w("ReactNative", "RealPathUtil rejected content uri served by this app")
                    return null
                }
                getPathFromSavingTempFile(context, uri)
            }
            ContentResolver.SCHEME_FILE -> {
                val path = uri.path?.let { getCachePath(context, it) }
                if (path == null) {
                    Log.w("ReactNative", "RealPathUtil rejected file uri outside the cache directory")
                }
                path
            }
            else -> null
        }
    }

    private fun isOwnProvider(context: Context, uri: Uri): Boolean {
        val authority = uri.authority?.substringAfterLast('@') ?: return true
        val provider = context.packageManager.resolveContentProvider(authority, 0)
        return provider?.packageName == context.packageName
    }

    private fun getCachePath(context: Context, path: String): String? {
        return try {
            val file = File(path).canonicalFile
            if (file.toPath().startsWith(context.cacheDir.canonicalFile.toPath())) file.absolutePath else null
        } catch (e: IOException) {
            null
        }
    }

    private fun getPathFromSavingTempFile(context: Context, uri: Uri): String? {
        var fileName: String? = null
        try {
            context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (nameIndex >= 0 && cursor.moveToFirst()) {
                    fileName = sanitizeFilename(cursor.getString(nameIndex))
                }
            }
        } catch (e: Exception) {
            // just continue to get the filename with the last segment of the path
        }

        val name = fileName ?: sanitizeFilename(uri.lastPathSegment?.trim()) ?: return null
        val tmpDir = File(File(context.cacheDir, CACHE_DIR_NAME), UUID.randomUUID().toString())
        val tmpFile = File(tmpDir, name)
        val copied = try {
            tmpDir.mkdirs()
            context.contentResolver.openInputStream(uri)?.use { input ->
                FileOutputStream(tmpFile).use { output -> input.copyTo(output) }
            } != null
        } catch (e: Exception) {
            Log.w("ReactNative", "RealPathUtil failed to copy content uri: ${e.javaClass.simpleName}")
            false
        }

        if (!copied) {
            tmpDir.deleteRecursively()
            return null
        }
        return tmpFile.absolutePath
    }

    private fun sanitizeFilename(filename: String?): String? {
        val name = filename?.let { File(it).name.replace(UNSAFE_FILENAME_CHARS, "_") }
        return if (name.isNullOrBlank() || name == "." || name == "..") null else name
    }

    private fun getExtension(uri: String?): String? {
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

    private fun getMimeType(file: File): String? {
        val extension = getExtension(file.name)
        if (extension?.length!! > 0) {
            return MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension.substring(1))
        }

        return "application/octet-stream"
    }

    fun getMimeType(filePath: String): String? {
        val file = File(filePath)
        return getMimeType(file)
    }

    private fun deleteTempFiles(dir:File) {
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
