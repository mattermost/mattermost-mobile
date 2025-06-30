package com.mattermost.securepdfviewer.pdfium

import android.content.Context
import android.graphics.Canvas
import android.util.AttributeSet
import android.util.Log
import android.view.GestureDetector
import android.view.MotionEvent
import android.view.ScaleGestureDetector
import android.view.View
import android.widget.Scroller
import com.mattermost.pdfium.model.PdfLink
import com.mattermost.securepdfviewer.pdfium.gesture.ScaleListener
import com.mattermost.securepdfviewer.pdfium.gesture.ScrollGestureListener
import com.mattermost.securepdfviewer.pdfium.interaction.LinkHandler
import com.mattermost.securepdfviewer.pdfium.interaction.ScrollHandler
import com.mattermost.securepdfviewer.pdfium.interaction.ZoomAnimator
import com.mattermost.securepdfviewer.pdfium.layout.CoordinateConverter
import com.mattermost.securepdfviewer.pdfium.layout.LayoutCalculator
import com.mattermost.securepdfviewer.pdfium.manager.PdfDocumentManager
import com.mattermost.securepdfviewer.pdfium.manager.PdfRenderManager
import com.mattermost.securepdfviewer.pdfium.shared.PdfContext
import com.mattermost.securepdfviewer.pdfium.shared.PdfViewInterface
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.runBlocking

class PdfView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr), PdfViewInterface {
    companion object {
        private const val TAG = "PdfView"

        // Layout constants
        internal const val PAGE_SPACING = 20
    }

    // Coroutine scope for async operations
    private val viewScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private val pdfContext: PdfContext
    private val scaleGestureDetector: ScaleGestureDetector
    private val gestureDetector: GestureDetector

    private val scroller: Scroller = Scroller(context)

    // Interface properties
    override val viewWidth: Int get() = super.getWidth()
    override val viewHeight: Int get() = super.getHeight()

    // Callbacks

    /**
     * Callback invoked when the document finishes loading successfully.
     *
     * @property onLoadComplete A lambda with no arguments, called when load completes.
     * Can be set to null to disable.
     */
    var onLoadComplete: (() -> Unit)? = null

    /**
     * Callback invoked when an error occurs during document loading.
     *
     * @property onLoadError A lambda receiving the Exception that caused the error.
     * Can be set to null to disable.
     */
    var onLoadError: ((Exception) -> Unit)? = null

    /**
     * Callback invoked when a tap event occurs on the view.
     *
     * @property onTap A lambda receiving the MotionEvent of the tap.
     * Can be set to null to disable.
     */
    var onTap: ((MotionEvent) -> Unit)? = null

    /**
     * Callback invoked when a link in the document is tapped.
     *
     * @property onLinkTapped A lambda receiving the PdfLink object for the tapped link.
     * Can be set to null to disable.
     */
    var onLinkTapped: ((PdfLink) -> Unit)? = null

    /**
     * Callback invoked when the current page changes during scrolling.
     *
     * Callback invoked when the scroll position changes.
     *
     * @property onPageChanged A lambda receiving the new current page (0-based index) .
     * Can be set to null to disable the callback.
     */
    var onPageChanged: ((Int) -> Unit)? = null

    /**
     * Callback invoked when the scroll position changes.
     *
     * @property onScrollChanged A lambda receiving the new scroll offset (Float).
     * Can be set to null to disable the callback.
     */
    var onScrollChanged: ((Float) -> Unit)? = null


    fun markViewReady() = pdfContext.markViewReady()
    fun loadDocument(filePath: String, password: String?) =
        pdfContext.documentManager.loadDocument(pdfContext, filePath, password)

    fun getCurrentPage() = pdfContext.documentManager.currentPage
    fun getPageCount() = pdfContext.documentManager.getPageCount()

    fun getCurrentZoomScale() = pdfContext.zoomAnimator.currentZoomScale

    fun getCurrentScrollY() = pdfContext.scrollHandler.scrollY
    fun getTotalDocumentHeight() = pdfContext.scrollHandler.totalDocumentHeight

    fun getEstimatedPageBounds(pageNum: Int) = pdfContext.layoutCalculator.getEstimatedPageBounds(pageNum)

    // Initialization

    init {
        setWillNotDraw(false)
        Log.d(TAG, "PdfView initialized")

        pdfContext = PdfContext(context, viewScope, scroller)
        pdfContext.documentManager = PdfDocumentManager(pdfContext, this)
        pdfContext.layoutCalculator = LayoutCalculator(pdfContext, this)
        pdfContext.coordinateConverter = CoordinateConverter(pdfContext, this)
        pdfContext.renderManager = PdfRenderManager(pdfContext, this)
        pdfContext.zoomAnimator = ZoomAnimator(pdfContext, this)
        pdfContext.linkHandler = LinkHandler(pdfContext)
        pdfContext.scrollHandler = ScrollHandler(pdfContext, this)
        pdfContext.scrollGestureListener = ScrollGestureListener(pdfContext, this)
        pdfContext.scaleListener = ScaleListener(pdfContext, this)


        gestureDetector = GestureDetector(context, pdfContext.scrollGestureListener)
        scaleGestureDetector = ScaleGestureDetector(context, pdfContext.scaleListener)
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        // Cancel all ongoing renders first
        runBlocking {
            try {
                pdfContext.renderManager.cancelAllRendersAndWait()
                pdfContext.layoutCalculator.stopCalculations()
                pdfContext.markViewDestroyedAndShutdown()
                pdfContext.documentManager.safeCleanupWithWait()
                Log.d(TAG, "All cleanup completed successfully")
            } catch (e: Exception) {
                Log.e(TAG, "Error during cleanup", e)
            }
        }


        Log.d(TAG, "View detached")
        scroller.forceFinished(true)

        pdfContext.scrollGestureListener.stopCustomFlinging()
        pdfContext.zoomAnimator.reset()
        pdfContext.cacheManager.cleanup()
        pdfContext.scrollHandler.reset()
        viewScope.cancel()
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        super.onMeasure(widthMeasureSpec, heightMeasureSpec)
        Log.d(TAG, "onMeasure called: ${MeasureSpec.getSize(widthMeasureSpec)}x${MeasureSpec.getSize(heightMeasureSpec)}")
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        Log.d(TAG, "Size changed: ${oldw}x${oldh} -> ${w}x${h}")
        if (
            !pdfContext.documentManager.isDocumentLoading() &&
            pdfContext.document.isValid() &&
            w > 0 && h > 0
        ) {
            pdfContext.markViewReady()
            pdfContext.layoutCalculator.stopCalculations()
            pdfContext.zoomAnimator.calculateBaseZoom()
            pdfContext.layoutCalculator.preCalculateInitialPageSizes()
            pdfContext.layoutCalculator.updateDocumentLayout()
            pdfContext.layoutCalculator.launchDeferredPageSizeCalculation(viewScope)
        }
    }

    override fun onDraw(canvas: Canvas) {
        pdfContext.layoutCalculator.notifyRenderingStarted()
        super.onDraw(canvas)
        pdfContext.renderManager.drawView(canvas)
        pdfContext.layoutCalculator.notifyRenderingEnded()
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        val scaledHandled = scaleGestureDetector.onTouchEvent(event)
        val gestureHandled = gestureDetector.onTouchEvent(event)

        if (event.action == MotionEvent.ACTION_UP && !scaleGestureDetector.isInProgress) {
            performClick()
        }

        return scaledHandled || gestureHandled
    }

    override fun performClick(): Boolean {
        super.performClick()
        return true
    }

    override fun computeScroll() {
        super.computeScroll()
        pdfContext.scrollHandler.computeScroll()
    }

    fun setContextCallbacks() {
        pdfContext.onTap = this.onTap
        pdfContext.onPageChanged = this.onPageChanged
        pdfContext.onScrollChanged = this.onScrollChanged
        pdfContext.onLinkTapped = this.onLinkTapped
        pdfContext.onLoadComplete = this.onLoadComplete
        pdfContext.onLoadError = this.onLoadError
    }
}
