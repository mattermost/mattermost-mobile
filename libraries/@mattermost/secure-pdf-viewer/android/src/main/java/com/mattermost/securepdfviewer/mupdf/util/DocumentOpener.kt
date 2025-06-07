package com.mattermost.securepdfviewer.mupdf.util

import android.util.Log
import com.artifex.mupdf.fitz.Document
import com.mattermost.securepdfviewer.mupdf.exceptions.DocumentOpenException
import com.mattermost.securepdfviewer.mupdf.exceptions.InvalidPasswordException
import com.mattermost.securepdfviewer.mupdf.exceptions.PasswordRequiredException

/**
 * Utility class for handling PDF document opening and authentication operations.
 *
 * This class encapsulates the complex process of opening PDF documents with MuPDF,
 * including password authentication for encrypted documents and proper error handling.
 * It provides a clean separation between document opening logic and document management.
 *
 * Key features:
 * - **Secure Authentication**: Proper handling of encrypted PDF documents
 * - **Error Management**: Comprehensive error handling with specific exception types
 * - **Resource Safety**: Ensures proper cleanup on opening failures
 * - **Validation**: Pre-opening validation and post-opening verification
 */
internal object DocumentOpener {

    private const val TAG = "DocumentOpener"

    /**
     * Opens a PDF document from the specified file path with optional password authentication.
     *
     * This factory method handles the complete document opening process, including:
     * - Native document loading through MuPDF
     * - Password authentication for encrypted documents
     * - Initial validation and setup
     * - Proper error handling and resource cleanup on failure
     *
     * @param filePath Absolute path to the PDF file to open
     * @param password Optional password for encrypted documents (null for unencrypted)
     * @return Successfully opened MuPDF Document instance
     * @throws PasswordRequiredException if document requires password but none provided
     * @throws InvalidPasswordException if provided password is incorrect
     * @throws DocumentOpenException for other opening errors (corrupted file, unsupported format, etc.)
     */
    fun openDocument(filePath: String, password: String? = null): Document {
        try {
            Log.d(TAG, "Opening document: $filePath")

            val document = Document.openDocument(filePath)

            if (document.needsPassword()) {
                if (password.isNullOrEmpty()) {
                    document.destroy()
                    throw PasswordRequiredException("Document requires password")
                }

                if (!document.authenticatePassword(password)) {
                    document.destroy()
                    throw InvalidPasswordException("Invalid password provided")
                }
            }

            val pageCount = document.countPages()
            Log.d(TAG, "Document opened successfully with $pageCount pages")

            return document

        } catch (e: Exception) {
            Log.e(TAG, "Failed to open document", e)
            when (e) {
                is PasswordRequiredException,
                is InvalidPasswordException -> throw e
                else -> throw DocumentOpenException("Failed to open document: ${e.message}", e)
            }
        }
    }
}
