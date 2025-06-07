package com.mattermost.securepdfviewer.view.callbacks

import android.util.Log
import com.mattermost.securepdfviewer.manager.PasswordAttemptStore
import com.mattermost.securepdfviewer.mupdf.MuPDFView
import com.mattermost.securepdfviewer.util.HashUtils
import com.mattermost.securepdfviewer.view.SecurePdfViewerView
import com.mattermost.securepdfviewer.view.emitter.PdfEventEmitter

/**
 * Manages all callback handlers for PDF view events.
 *
 * This class establishes the communication bridge between the native PDF view
 * and both the scroll handle component and the React Native layer through event emission.
 *
 * Key responsibilities:
 * - User interaction event handling (taps, links)
 * - Scroll handle synchronization during navigation and scrolling
 * - Document lifecycle event coordination
 * - Security validation for link interactions
 */
class PdfViewCallbacks(
    private val viewer: SecurePdfViewerView,
    private val pdfView: MuPDFView,
    private val attemptStore: PasswordAttemptStore,
    private val eventEmitter: PdfEventEmitter,
) {

    companion object {
        private const val TAG = "PdfViewCallbacks"
    }


    /**
     * Sets up all callback handlers for PDF view events.
     *
     * This method establishes the communication bridge between the native PDF view
     * and both the scroll handle component and the React Native layer.
     */
    fun setupCallbacks() {

        // ===== USER INTERACTION EVENTS =====

        /**
         * Handle tap events on the PDF viewer.
         * Shows scroll handle on tap and emits tap coordinates to React Native.
         */
        pdfView.onTap = { event ->
            viewer.getScrollBarHandle()?.let { handle ->
                if (!handle.shown()) {
                    handle.show()
                }
                handle.hideDelayed()
            }

            val screenLocation = IntArray(2)
            viewer.getLocationOnScreen(screenLocation)
            eventEmitter.emitTapEvent(event, screenLocation)
        }

        /**
         * Handle link tap events with security validation.
         * Routes external links through permission checking and handles internal navigation.
         */
        pdfView.onLinkTapped = { link ->
            when {
                link.isExternal() && viewer.getAllowLinks() -> {
                    eventEmitter.emitLinkPressed(link.uri ?: "")
                }
                link.isExternal() && !viewer.getAllowLinks() -> {
                    eventEmitter.emitLinkPressedDisabled()
                }
                link.isInternal() -> {
                    // Internal links are handled automatically by MuPDFView
                    Log.d(TAG, "Internal link handled: page ${link.destinationPage}")
                }
            }
        }

        // ===== SCROLL HANDLE SYNCHRONIZATION =====

        /**
         * Update scroll handle when page changes during navigation.
         */
        pdfView.onPageChanged = { pageNumber ->
            viewer.getScrollBarHandle()?.setPageNum(pageNumber + 1) // Convert to 1-based page numbering
        }

        /**
         * Update scroll handle position and appearance during document scrolling.
         * Handles zoom state changes and provides real-time scroll position feedback.
         */
        pdfView.onScrollChanged = { scrollPercentage ->
            viewer.getScrollBarHandle()?.let { handle ->
                if (!handle.shown()) {
                    handle.show()
                }
                // Update thumb size when zoom changes
                if (pdfView.getCurrentZoomScale() != 1.0f) {
                    handle.updateForDocumentChange()
                }
                handle.setScroll(scrollPercentage)
            }
        }

        // ===== DOCUMENT LIFECYCLE EVENTS =====

        /**
         * Handle successful document loading.
         * Resets security state and initializes scroll handle display.
         */
        pdfView.onLoadComplete = {
            if (pdfView.parent == viewer) {
                viewer.removeView(pdfView)
            }
            viewer.addView(pdfView)
            eventEmitter.emitLoadComplete()

            // Reset password attempts on successful load
            val fileKey = viewer.getSource()?.let { HashUtils.sha256(it) }
            if (!viewer.getPassword().isNullOrEmpty() && !fileKey.isNullOrEmpty()) {
                attemptStore.resetAttempts(fileKey)
            }

            // Initialize scroll handle for newly loaded document
            viewer.getScrollBarHandle()?.let { handle ->
                handle.updateForDocumentChange()
                handle.setPageNum(1) // Show "1 / total pages"
                handle.show()
                handle.hideDelayed() // Auto-hide after delay
            }
        }

        /**
         * Handle document loading errors with detailed error categorization.
         */
        pdfView.onLoadError = { exception ->
            Log.e(TAG, "PDF load error", exception)
            val fileKey = viewer.getSource()?.let { HashUtils.sha256(it) }
            if (fileKey != null) {
                handleLoadError(exception, fileKey)
            } else {
                eventEmitter.emitLoadFailed(exception.message ?: "Unknown error")
            }
        }
    }

    /**
     * Handles document loading errors with intelligent error categorization.
     *
     * Distinguishes between password-related errors and other loading failures,
     * managing security features like password attempt limiting.
     *
     * @param throwable The exception that occurred during loading
     * @param fileKey Unique identifier for the document (for attempt tracking)
     */
    private fun handleLoadError(throwable: Throwable, fileKey: String) {
        val message = throwable.message ?: ""

        if (message.contains("password", ignoreCase = true)) {
            var retryAttempts = attemptStore.getRemainingAttempts(fileKey)
            if (retryAttempts <= attemptStore.maxAllowedAttempts() && viewer.getPassword() == null) {
                eventEmitter.emitPasswordRequired(fileKey)
                return
            }

            retryAttempts = attemptStore.registerFailedAttempt(fileKey)
            if (retryAttempts < attemptStore.maxAllowedAttempts()) {
                eventEmitter.emitPasswordFailed(retryAttempts)
            } else {
                eventEmitter.emitPasswordFailureLimitReached()
            }
        } else {
            eventEmitter.emitLoadFailed(message)
        }
    }
}
