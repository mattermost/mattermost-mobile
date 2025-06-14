package com.mattermost.securepdfviewer.pdfium.manager

import android.util.Log
import com.mattermost.securepdfviewer.pdfium.PdfDocument
import com.mattermost.securepdfviewer.pdfium.shared.PdfContext
import com.mattermost.securepdfviewer.pdfium.shared.PdfViewInterface
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.concurrent.atomic.AtomicBoolean

class PdfDocumentManager(private val context: PdfContext, private val view: PdfViewInterface) {
    companion object {
        private const val TAG = "PdfDocumentManager"
    }

    private val isDocumentLoading = AtomicBoolean(false)

    var currentPage = 0
        internal set

    /**
     * Gets whether the document is currently loading.
     */
    fun isDocumentLoading(): Boolean = isDocumentLoading.get()

    /**
     * Gets the total number of pages in the currently loaded document.
     *
     * @return Number of pages, or 0 if no document is loaded
     */
    fun getPageCount(): Int = context.document.getPageCount()

    /**
     * Loads a PDF document from the specified file path with optional password protection.
     *
     * This method handles the complete document loading lifecycle including:
     * - Cleanup of any previously loaded document
     * - Background loading to avoid blocking the UI thread
     * - Password authentication for protected documents
     * - Initial page size calculation and layout setup
     * - Error handling with appropriate callback notifications
     *
     * @param context the PdfContext
     * @param filePath Absolute path to the PDF file on the device storage
     * @param password Optional password for encrypted PDF documents
     */
    fun loadDocument(context: PdfContext, filePath: String, password: String? = null) {
        if (!isDocumentLoading.compareAndSet(false, true)) {
            Log.w(TAG, "Document already loading, ignoring request")
            return
        }

        context.viewScope.launch {
            try {
                Log.d(TAG, "Loading document")
                context.useDocumentIfInitialized {
                    safeCleanup()
                }

                val newDocument = withContext(Dispatchers.IO) {
                    PdfDocument.openDocument(context, filePath, password)
                }

                if (context.isViewDestroyed()) {
                    Log.d(TAG, "View destroyed during load")
                    newDocument.destroy()
                    return@launch
                }

                if (newDocument.isValid()) {
                    val pageCount = newDocument.getPageCount()
                    if (pageCount <= 0) {
                        Log.e(TAG, "Document loaded but has no pages")
                        newDocument.destroy()
                        context.onLoadError?.invoke(Exception("Document has no pages"))
                        return@launch
                    }

                    context.document = newDocument
                    currentPage = 0

                    Log.d(TAG, "Document loaded: $pageCount pages")

                    if (view.viewWidth > 0 && view.viewHeight > 0) {
                        context.markViewReady()
                        context.zoomAnimator.calculateBaseZoom()
                        context.layoutCalculator.preCalculateInitialPageSizes()
                        context.layoutCalculator.updateDocumentLayout()
                        context.layoutCalculator.launchDeferredPageSizeCalculation(context.viewScope)
                    }
                    isDocumentLoading.set(false)
                    context.onLoadComplete?.invoke()
                } else {
                    val message = "Failed to load document"
                    Log.e(TAG, message)
                    context.onLoadError?.invoke(Exception(message))
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error loading document", e)
                context.onLoadError?.invoke(e)
            } finally {
                isDocumentLoading.set(false)
            }
        }
    }

    /**
     * Safe cleanup that waits for renders to complete.
     */
    suspend fun safeCleanupWithWait() {
        if (!isDocumentLoading.compareAndSet(true, false)) {
            isDocumentLoading.set(false)
        }

        try {
            // Wait for all renders to complete before destroying document
            context.renderManager.cancelAllRendersAndWait()

            context.useDocumentIfInitialized { doc ->
                doc.destroy()
            }
            context.cacheManager.cleanup()
            context.scrollHandler.reset()
            context.zoomAnimator.reset()
            currentPage = 0
            Log.d(TAG, "Document cleanup completed safely")
        } catch (e: Exception) {
            Log.e(TAG, "Error during safe cleanup", e)
        }
    }

    /**
     * Non-blocking cleanup for synchronous contexts.
     */
    private fun safeCleanup() {
        context.viewScope.launch {
            safeCleanupWithWait()
        }
    }

}
