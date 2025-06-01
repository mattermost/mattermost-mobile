package com.mattermost.securepdfviewer.mupdf

import android.content.Context
import android.graphics.Canvas
import android.util.AttributeSet
import android.util.Log
import android.view.GestureDetector
import android.view.MotionEvent
import android.view.ScaleGestureDetector
import android.view.View
import android.widget.Scroller
import com.mattermost.securepdfviewer.mupdf.cache.PageCacheManager
import com.mattermost.securepdfviewer.mupdf.gesture.ScaleListener
import com.mattermost.securepdfviewer.mupdf.gesture.ScrollGestureListener
import com.mattermost.securepdfviewer.mupdf.interaction.LinkHandler
import com.mattermost.securepdfviewer.mupdf.interaction.ScrollHandler
import com.mattermost.securepdfviewer.mupdf.interaction.ZoomAnimator
import com.mattermost.securepdfviewer.mupdf.layout.CoordinateConverter
import com.mattermost.securepdfviewer.mupdf.layout.LayoutCalculator
import com.mattermost.securepdfviewer.mupdf.manager.DocumentManager
import com.mattermost.securepdfviewer.mupdf.manager.PageRenderer
import com.mattermost.securepdfviewer.mupdf.model.MuPDFLink
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel

/**
 * Advanced PDF viewer implementation using MuPDF library with comprehensive gesture support.
 *
 * This custom view provides a full-featured PDF viewing experience with the following capabilities:
 *
 * **Core Features:**
 * - Multi-page document rendering with efficient page caching
 * - Automatic page scaling to fit screen width with zoom support (1.0x to 3.0x)
 * - Smooth scrolling with momentum-based fling gestures
 * - Pinch-to-zoom with focal point preservation
 * - Double-tap zoom toggle between fit-width and 2x zoom
 * - Interactive link support (both internal navigation and external URLs)
 * - Password-protected document support
 *
 * **Performance Optimizations:**
 * - Asynchronous page rendering using Kotlin coroutines
 * - Intelligent page caching with memory constraint management
 * - Real-time visible page detection for efficient resource usage
 * - Background page preloading for smooth scrolling experience
 * - Bitmap memory management with automatic recycling
 *
 * **Gesture Handling:**
 * - Single tap for UI interaction and link activation
 * - Double tap for zoom toggle with smooth animation
 * - Pinch gestures for continuous zoom with focal point preservation
 * - Scroll and fling gestures for document navigation
 * - Horizontal panning when zoomed beyond screen width
 *
 * **Thread Safety:**
 * - All cache operations are properly synchronized
 * - Atomic flags prevent race conditions during loading/rendering
 * - Coroutine-based architecture for non-blocking operations
 *
 * The view is designed to be embedded within other UI components and provides
 * comprehensive callback support for integration with scroll handles, toolbars,
 * and React Native bridge components.
 *
 * **Note:** Components that could be extracted to separate files:
 * - Gesture handling logic → `gesture/PdfGestureHandler.kt`
 * - Page caching system → `cache/PageCacheManager.kt`
 * - Zoom animation logic → `animation/ZoomAnimator.kt`
 * - Coordinate conversion utilities → `util/CoordinateMapper.kt`
 */
class MuPDFView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    companion object {
        private const val TAG = "MuPDFView"

        // Layout constants
        internal const val PAGE_SPACING = 20
    }

    // Coroutine scope for async operations
    internal val viewScope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    // Core scrolling infrastructure
    internal val scroller = Scroller(context)

    internal val documentManager = DocumentManager(this)
    internal val zoomAnimator = ZoomAnimator(this)
    internal val layoutCalculator = LayoutCalculator(this)
    internal val coordinateConverter = CoordinateConverter(this)
    internal val pageCacheManager = PageCacheManager(this)
    internal val linkHandler = LinkHandler(this)
    internal val pageRenderer = PageRenderer(this)
    internal val scrollGestureListener = ScrollGestureListener(this)
    internal val scrollHandler = ScrollHandler(this)

    private val scaleGestureDetector = ScaleGestureDetector(context, ScaleListener(this))
    private val gestureDetector = GestureDetector(context, scrollGestureListener)

    // Direct access to cache collections
    internal val pageSizes: MutableMap<Int, Pair<Float, Float>> get() = pageCacheManager.pageSizes
    internal val pageOffsets: MutableMap<Int, Float> get() = pageCacheManager.pageOffsets
    internal val cacheAccessLock: Any get() = pageCacheManager.cacheAccessLock

    // Direct access to document state
    internal val document: MuPDFDocument? get() = documentManager.document
    internal var currentPage: Int
        get() = documentManager.currentPage
        set(value) { documentManager.currentPage = value }

    // Function-based access for flags with atomic operations
    internal fun isViewReady(): Boolean = documentManager.isViewReady
    private fun markViewReady() = documentManager.markViewReady()

    internal fun isDocumentLoading(): Boolean = documentManager.isDocumentLoading()
    internal fun isViewDestroyed(): Boolean = documentManager.isViewDestroyed()

    // Public API
    fun getPageCount(): Int = documentManager.getPageCount()
    fun loadDocument(filePath: String, password: String? = null) = documentManager.loadDocument(filePath, password)

    // Internal API for navigation
    internal fun jumpToPage(pageNum: Int) = documentManager.jumpToPage(pageNum)

    // Callbacks

    /**
     * Callback triggered when document loading completes successfully.
     */
    var onLoadComplete: (() -> Unit)? = null

    /**
     * Callback triggered when document loading fails.
     * @param exception Details about the loading failure
     */
    var onLoadError: ((Exception) -> Unit)? = null

    /**
     * Callback triggered when user taps on the document (not on a link).
     * @param event The motion event containing tap coordinates and metadata
     */
    internal var onTap: ((MotionEvent) -> Unit)? = null

    /**
     * Callback triggered when user taps on an external link.
     * @param link The link object containing URL and metadata
     */
    internal var onLinkTapped: ((MuPDFLink) -> Unit)? = null

    /**
     * Callback triggered when the current page changes during scrolling.
     * @param pageNumber The new current page (0-based index)
     */
    var onPageChanged: ((Int) -> Unit)? = null

    /**
     * Callback triggered when scroll position changes.
     * @param scrollPercentage Current scroll position as percentage (0.0 to 1.0)
     */
    var onScrollChanged: ((Float) -> Unit)? = null

    // Initialization

    init {
        setWillNotDraw(false)
        Log.d(TAG, "MuPDFView initialized")
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        Log.d(TAG, "View detached")

        documentManager.onDetachedFromWindow()
        scrollHandler.reset()
        viewScope.cancel()
    }

    // Document information and State
    /**
     * Gets the current page number based on scroll position and viewport.
     *
     * @return Current page index (0-based)
     */
    fun getCurrentPage(): Int = layoutCalculator.getCurrentVisiblePage()

    /**
     * Gets the current zoom scale factor.
     *
     * @return Current zoom scale (1.0 = fit-to-width, 3.0 = maximum zoom)
     */
    fun getCurrentZoomScale(): Float = zoomAnimator.currentZoomScale

    /**
     * Gets the total document height at current zoom level.
     *
     * @return Total document height in pixels
     */
    fun getTotalDocumentHeight(): Float = scrollHandler.totalDocumentHeight

    /**
     * Gets the current vertical scroll position.
     *
     * @return Current scroll Y position in pixels
     */
    fun getCurrentScrollY(): Float = scrollHandler.scrollY

    // Drawing and display

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        Log.d(TAG, "Size changed: ${oldw}x${oldh} -> ${w}x${h}")

        if (document?.isValid() == true && w > 0 && h > 0 && !isDocumentLoading()) {
            zoomAnimator.calculateBaseZoom()
            pageCacheManager.preCalculateAllPageSizes()
            layoutCalculator.updateDocumentLayout()
            markViewReady()
            pageCacheManager.manageCache()
        }
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        pageRenderer.drawView(canvas)
    }

    // Touch event handling

    override fun onTouchEvent(event: MotionEvent): Boolean {
        val scaleHandled = scaleGestureDetector.onTouchEvent(event)
        val gestureHandled = gestureDetector.onTouchEvent(event)

        if (event.action == MotionEvent.ACTION_UP && !scaleGestureDetector.isInProgress) {
            performClick()
        }

        return scaleHandled || gestureHandled
    }

    override fun performClick(): Boolean {
        super.performClick()
        return true
    }

    // Scroll animation system

    /**
     * Handles scroll animation with custom fling implementation and zoom animation.
     *
     * Orchestrates multiple animation systems:
     * - Zoom animations with smooth interpolation
     * - Standard Android scroller for smooth scrolling
     * - Custom fling implementation for consistent behavior
     * - Scroll handle updates during all animation types
     */
    override fun computeScroll() {
        super.computeScroll()
        scrollHandler.computeScroll()
    }
}
