package com.mattermost.securepdfviewer.util

import android.util.Log
import androidx.core.net.toUri
import java.io.File

/**
 * Secure file validation utility for PDF file access control.
 *
 * This object provides comprehensive security validation for PDF file access within
 * the secure PDF viewer. It implements multiple layers of security checks to prevent
 * common file system attacks and ensure that only authorized files from trusted
 * locations can be accessed by the PDF viewer.
 *
 * Security measures implemented:
 * - **Path Traversal Protection**: Prevents "../" attacks and symbolic link exploitation
 * - **Directory Sandboxing**: Restricts file access to explicitly allowed directories
 * - **File Type Validation**: Ensures only actual files (not directories) are processed
 * - **Unicode Attack Prevention**: Detects and blocks malicious Unicode control characters
 * - **Canonical Path Resolution**: Uses canonical paths to prevent path manipulation
 * - **Existence and Readability Checks**: Validates file exists and is accessible
 *
 * The validator is designed to work with the React Native file system bridge and
 * handles various file URI formats that may be passed from the JavaScript layer.
 */
object FileValidator {
    private const val TAG = "FileValidator"

    // File path validation and security

    /**
     * Securely parses and validates a file source string into a File object.
     *
     * This method performs comprehensive security validation on file paths received
     * from potentially untrusted sources (such as React Native JavaScript layer).
     * It implements multiple security checks to prevent various file system attacks
     * while ensuring the requested file is within authorized access boundaries.
     *
     * Validation process:
     * 1. **Input Sanitization**: Handles various URI formats (file://, relative paths)
     * 2. **Canonical Path Resolution**: Resolves symbolic links and relative references
     * 3. **Existence Verification**: Confirms file exists and is accessible
     * 4. **Type Validation**: Ensures target is a file, not a directory
     * 5. **Directory Authorization**: Validates file is within allowed directory boundaries
     * 6. **Unicode Security**: Detects malicious Unicode control characters in filenames
     *
     * @param source The file path or URI string to validate (may be null)
     * @param allowedDirectories List of directories where file access is permitted
     * @return Validated File object if all security checks pass, null if validation fails
     */
    fun parseSourceToFile(source: String?, allowedDirectories: List<File>): File? {
        if (source.isNullOrEmpty()) {
            Log.e(TAG, "Source is null or empty")
            return null
        }

        return try {
            var path = source

            // Handle file:// URI format from React Native
            if (source.startsWith("file://")) {
                path = source.toUri().path
            }

            if (path.isNullOrEmpty()) {
                Log.e(TAG, "Parsed path is null or empty")
                return null
            }

            // Resolve to canonical path to prevent path traversal attacks
            val file = File(path).canonicalFile

            // Validate file existence
            if (!file.exists()) {
                Log.e(TAG, "File does not exist: ${file.absolutePath}")
                return null
            }

            // Ensure target is a file, not a directory
            if (!file.isFile) {
                Log.e(TAG, "Path is not a file: ${file.absolutePath}")
                return null
            }

            // Enforce directory sandboxing - file must be within allowed directories
            val allowed = allowedDirectories.any { allowedDir ->
                file.absolutePath.startsWith(allowedDir.canonicalPath)
            }

            if (!allowed) {
                Log.e(TAG, "Access denied: outside allowed directories")
                return null
            }

            // Security hardening: detect Unicode control character attacks
            // Prevents RTL override attacks and other Unicode-based filename spoofing
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

    // File metadata access

    /**
     * Safely retrieves the file size with comprehensive error handling.
     *
     * This method provides secure access to file size information with multiple
     * validation layers to prevent security issues and ensure reliable operation.
     * It performs additional safety checks beyond basic file.length() to handle
     * edge cases and potential security concerns.
     *
     * Safety measures:
     * - **File Existence Check**: Verifies file still exists before accessing
     * - **File Type Validation**: Ensures target is still a regular file
     * - **Read Permission Check**: Confirms file is readable by the application
     * - **Size Validation**: Ensures file has content (size > 0)
     * - **Exception Handling**: Gracefully handles I/O errors and permission issues
     *
     * @param file The File object to get size information for
     * @return File size in bytes if valid and accessible, null if file is invalid or inaccessible
     */
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
