package com.mattermost.securepdfviewer.view.manager

import android.content.Context
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import com.mattermost.securepdfviewer.manager.PasswordAttemptStore
import com.mattermost.securepdfviewer.pdfium.PdfView
import com.mattermost.securepdfviewer.util.FileValidator
import com.mattermost.securepdfviewer.util.HashUtils
import com.mattermost.securepdfviewer.util.MemoryUtil
import com.mattermost.securepdfviewer.view.emitter.PdfEventEmitter
import java.util.Locale

/**
 * Manages PDF document loading and validation logic.
 *
 * This class handles all aspects of PDF document loading including comprehensive
 * security validation, file system checks, memory management, and authentication.
 *
 * Key responsibilities:
 * - File path validation against allowed directories
 * - Password attempt limit checking and enforcement
 * - File size validation to prevent memory exhaustion
 * - Document loading coordination with PDFium
 * - Security state management during loading process
 */
class PdfLoadManager(
    private val context: Context,
    private val pdfView: PdfView,
    private val eventEmitter: () -> PdfEventEmitter?,
    private val attemptStore: PasswordAttemptStore,
    private val backgroundColor: ColorDrawable?
) {

    /**
     * Attempts to load the PDF document with comprehensive security validation.
     *
     * This method performs multiple security checks before loading:
     * - File path validation against allowed directories
     * - Password attempt limit checking
     * - File size validation to prevent memory exhaustion
     * - Document authentication if password protected
     *
     * @param source Path to the PDF document file
     * @param password Password for encrypted PDF documents (can be null)
     */
    fun loadPdf(source: String?, password: String?) {
        if (source == null) {
            eventEmitter()?.emitLoadFailed("No source specified")
            return
        }

        // Check password attempt limits for security
        val fileKey = HashUtils.sha256(source)
        if (attemptStore.hasExceededLimit(fileKey)) {
            eventEmitter()?.emitPasswordFailureLimitReached()
            return
        }

        // Validate file path against allowed directories
        val allowedDirs = listOfNotNull(context.cacheDir, context.externalCacheDir)
        val file = FileValidator.parseSourceToFile(source, allowedDirs)
        if (file == null) {
            eventEmitter()?.emitLoadFailed("Invalid or unauthorized file")
            return
        }

        // Validate file size to prevent memory exhaustion attacks
        val fileSize = FileValidator.getSafeFileSize(file)
        val maxSize = MemoryUtil.getMaxPdfSize(context)
        if (fileSize == null) {
            eventEmitter()?.emitLoadFailed("Unable to read file size")
            return
        }

        if (fileSize > maxSize) {
            val sizeInMB = fileSize / (1024.0 * 1024.0)
            val limitInMB = maxSize / (1024.0 * 1024.0)
            val error = String.format(
                Locale.US,
                "The PDF file is too large to process: %.1f MB. Maximum supported size is %.0f MB.",
                sizeInMB,
                limitInMB
            )
            eventEmitter()?.emitLoadFailed(error)
            return
        }

        // Apply background color and load document
        val bgColor = backgroundColor?.color ?: Color.LTGRAY
        pdfView.setBackgroundColor(bgColor)

        // Load document through PDFium
        pdfView.loadDocument(file.absolutePath, password)
    }
}
