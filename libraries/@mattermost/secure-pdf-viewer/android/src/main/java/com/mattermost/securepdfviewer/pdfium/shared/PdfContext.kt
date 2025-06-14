package com.mattermost.securepdfviewer.pdfium.shared

import android.content.Context
import android.widget.Scroller
import com.mattermost.pdfium.model.PdfLink
import com.mattermost.securepdfviewer.pdfium.PdfDocument
import com.mattermost.securepdfviewer.pdfium.cache.PdfCacheManager
import com.mattermost.securepdfviewer.pdfium.gesture.ScaleListener
import com.mattermost.securepdfviewer.pdfium.gesture.ScrollGestureListener
import com.mattermost.securepdfviewer.pdfium.interaction.LinkHandler
import com.mattermost.securepdfviewer.pdfium.interaction.ScrollHandler
import com.mattermost.securepdfviewer.pdfium.interaction.ZoomAnimator
import com.mattermost.securepdfviewer.pdfium.layout.CoordinateConverter
import com.mattermost.securepdfviewer.pdfium.layout.LayoutCalculator
import com.mattermost.securepdfviewer.pdfium.manager.PdfDocumentManager
import com.mattermost.securepdfviewer.pdfium.manager.PdfRenderManager
import com.mattermost.securepdfviewer.pdfium.util.ViewUtils
import kotlinx.coroutines.CoroutineScope
import java.util.concurrent.atomic.AtomicBoolean

class PdfContext(
    private val context: Context,
    val viewScope: CoroutineScope,
    val scroller: Scroller,
) {
    val cacheManager = PdfCacheManager()
    val nativeCoordinator = NativeAccessCoordinator()

    private val isViewDestroyed = AtomicBoolean(false)
    var isViewReady = false
        private set

    lateinit var document: PdfDocument
    lateinit var documentManager: PdfDocumentManager
    lateinit var layoutCalculator: LayoutCalculator
    lateinit var coordinateConverter: CoordinateConverter
    lateinit var renderManager: PdfRenderManager
    lateinit var zoomAnimator: ZoomAnimator
    lateinit var linkHandler: LinkHandler
    lateinit var scrollHandler: ScrollHandler
    lateinit var scrollGestureListener: ScrollGestureListener
    lateinit var scaleListener: ScaleListener

    // Optional callbacks (to be set from PdfView)
    var onLoadComplete: (() -> Unit)? = null
    var onLoadError: ((Exception) -> Unit)? = null
    var onTap: ((android.view.MotionEvent) -> Unit)? = null
    var onLinkTapped: ((PdfLink) -> Unit)? = null
    var onPageChanged: ((Int) -> Unit)? = null
    var onScrollChanged: ((Float) -> Unit)? = null

    /**
     * Gets whether the view has been destroyed.
     */
    fun isViewDestroyed(): Boolean = isViewDestroyed.get()

    /**
     * Marks the view as destroyed and shuts down native access coordinator.
     */
    suspend fun markViewDestroyedAndShutdown() {
        isViewReady = false
        isViewDestroyed.set(true)
        nativeCoordinator.shutdown()
    }

    /**
     * Marks the view as ready for rendering.
     */
    fun markViewReady() {
        isViewReady = true
    }

    fun dpToPx(dp: Int): Float = ViewUtils.dpToPx(context, dp)

    fun useDocumentIfInitialized(action: (PdfDocument) -> Unit) {
        if (::document.isInitialized) {
            action(document)
        }
    }
}
