package com.mattermost.securepdfviewer.util

import android.util.Log
import androidx.core.net.toUri
import java.io.File

object FileValidator {
    private const val TAG = "FileValidator"

    fun parseSourceToFile(source: String?, allowedDirectories: List<File>): File? {
        if (source.isNullOrEmpty()) {
            Log.e(TAG, "Source is null or empty")
            return null
        }

        return try {
            var path = source

            if (source.startsWith("file://")) {
                path = source.toUri().path
            }

            if (path.isNullOrEmpty()) {
                Log.e(TAG, "Parsed path is null or empty")
                return null
            }

            val file = File(path).canonicalFile

            // Validate existence
            if (!file.exists()) {
                Log.e(TAG, "File does not exist: ${file.absolutePath}")
                return null
            }

            // Validate it is a real file (not a directory)
            if (!file.isFile) {
                Log.e(TAG, "Path is not a file: ${file.absolutePath}")
                return null
            }

            // Validate it is inside allowed directories
            val allowed = allowedDirectories.any { allowedDir ->
                file.absolutePath.startsWith(allowedDir.canonicalPath)
            }

            if (!allowed) {
                Log.e(TAG, "Access denied: outside allowed directories")
                return null
            }

            // (Optional) Harden hidden Unicode attacks (like RTL overrides)
            if (file.name.any { it.isISOControl() }) {
                Log.e(TAG, "File name contains invalid control characters")
                return null
            }

            file
        } catch (e: Exception) {
            Log.e(TAG, "Error securely parsing source file", e)
            null
        }
    }

    fun getSafeFileSize(file: File): Long? {
        return try {
            if (file.exists() && file.isFile && file.canRead()) {
                file.length().takeIf { it > 0 }
            } else {
                null
            }
        } catch (e: Exception) {
            null
        }
    }
}
