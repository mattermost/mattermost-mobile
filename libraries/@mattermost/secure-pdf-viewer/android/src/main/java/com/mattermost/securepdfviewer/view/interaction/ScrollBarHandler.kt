package com.mattermost.securepdfviewer.view.interaction

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.core.view.isVisible
import com.mattermost.securepdfviewer.pdfium.PdfView
import com.mattermost.securepdfviewer.pdfium.util.ViewUtils
import com.mattermost.securepdfviewer.view.SecurePdfViewerView
import com.mattermost.securepdfviewer.view.scrollhandle.BubbleView
import com.mattermost.securepdfviewer.view.scrollhandle.ScrollBarView
import com.mattermost.securepdfviewer.view.scrollhandle.ScrollThumbView

/**
 * Custom scroll handle component for PDF documents with intelligent page indicator and smooth scrolling.
 *
 * This component provides a visual scroll indicator that appears on the side of the PDF viewer,
 * similar to scroll handles found in modern document viewers. It displays the current page position
 * and allows users to quickly navigate through the document by dragging the scroll thumb.
 *
 * Key features:
 * - Automatic visibility management (shows during scroll, hides when idle)
 * - Intelligent page range detection (shows single page or page range based on page size)
 * - Responsive scroll thumb sizing based on document length
 * - Support for both left and right side positioning
 * - Smooth animations and visual feedback
 *
 * @param context Android context for creating views
 * @param inverted Whether to position the scroll handle on the left (true) or right (false) side
 */
class ScrollBarHandler @JvmOverloads constructor(
    private val context: Context,
    private val inverted: Boolean = false
) : FrameLayout(context) {

    // Properties & state management

    /** Reference to the parent PDF viewer container */
    private var securePdfView: SecurePdfViewerView? = null

    /** Current page number (1-based) */
    private var currentPage = 0

    /** Total number of pages in the document */
    private var pageCount = 0

    /** Whether the user is currently dragging the scroll handle */
    private var isDragging = false

    /** Whether the document is currently being scrolled (prevents auto-hide) */
    private var isScrolling = false

    // Handlers & Timing

    /** Main thread handler for scheduling UI updates */
    private val handler = Handler(Looper.getMainLooper())

    /** Runnable for hiding the scroll handle after delay */
    private val hidePageScrollerRunnable = Runnable { hide() }

    /** Handler for detecting when scrolling stops */
    private val scrollStopHandler = Handler(Looper.getMainLooper())

    /** Runnable for handling scroll stop detection */
    private val scrollStopRunnable = Runnable {
        isScrolling = false
        hideDelayed()
    }

    // UI Components

    /** The bubble view that displays page information */
    private val bubbleView: BubbleView

    /** The scroll bar track background */
    private val scrollBar: ScrollBarView

    /** The draggable scroll thumb */
    private val scrollThumb: ScrollThumbView

    // Visual customization

    /** Background color for the page indicator bubble */
    private val bubbleBackgroundColor = 0xFFF5F5F5.toInt() // Light Gray

    /** Color for the scroll bar track */
    private val scrollBarColor = 0xFFE0E0E0.toInt() // Light Gray

    /** Color for the scroll thumb */
    private val scrollThumbColor = 0xFF757575.toInt() // Dark Gray

    /** Text color for page numbers */
    private val textColor = 0xFF333333.toInt() // Dark Gray

    // Layout dimensions

    /** Horizontal padding inside the page indicator bubble */
    private val bubblePaddingHorizontal = dp(12f)

    /** Fixed height for the page indicator bubble */
    private val bubbleHeight = dp(32f)

    /** Corner radius for the page indicator bubble */
    private val bubbleCornerRadius = dp(16f)

    /** Width of the scroll bar track */
    private val scrollBarWidth = dp(4f)

    /** Width of the scroll thumb */
    private val scrollThumbWidth = dp(6f)

    /** Minimum height for the scroll thumb */
    private val scrollThumbMinHeight = dp(48f)

    /** Margin from screen edge */
    private val edgeMargin = dp(0f)

    /** Margin between bubble and scroll bar */
    private val bubbleMargin = dp(4f)

    init {
        visibility = INVISIBLE
        clipChildren = false
        clipToPadding = false
        setWillNotDraw(false)


        // Create scroll bar track
        scrollBar = ScrollBarView(context, scrollBarColor, scrollBarWidth)
        val scrollBarParams = LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.MATCH_PARENT)
        addView(scrollBar, scrollBarParams)

        // Create draggable scroll thumb
        scrollThumb = ScrollThumbView(context, scrollThumbColor, scrollThumbWidth)
        addView(scrollThumb, LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
            if (inverted) {
                leftMargin = dp(4f)
            } else {
                rightMargin = dp(4f)
            }
        })

        // Create page indicator bubble
        bubbleView = BubbleView(
            context,
            bubbleBackgroundColor,
            textColor,
            bubbleCornerRadius.toFloat(),
            bubblePaddingHorizontal,
            bubbleHeight
        )
        addView(bubbleView, LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT))

        post {
            updateComponentPositions()
        }
    }

    // Lifecycle management

    /**
     * Sets up the scroll handle within the PDF viewer layout.
     *
     * @param securePdfView The parent PDF viewer container that will host this scroll handle
     */
    fun setupLayout(securePdfView: SecurePdfViewerView) {
        val layoutParams = LayoutParams(
            LayoutParams.MATCH_PARENT,
            LayoutParams.MATCH_PARENT
        )
        layoutParams.setMargins(0, dp(12f), 0, dp(12f))

        securePdfView.addView(this, layoutParams)
        this.securePdfView = securePdfView

        // Get page count from the Pdf view
        val pdfView = securePdfView.getChildAt(0) as? PdfView
        this.pageCount = pdfView?.getPageCount() ?: 0

        post {
            updateComponentPositions()
            updateScrollThumbSize()
        }
    }

    /**
     * Cleans up resources and removes the scroll handle from its parent.
     */
    fun destroy() {
        securePdfView?.removeView(this)
        handler.removeCallbacks(hidePageScrollerRunnable)
    }

    // Scroll position management

    /**
     * Updates the scroll handle position based on document scroll percentage.
     *
     * This method is called when the document is scrolled to keep the scroll handle
     * position synchronized with the actual document position.
     *
     * @param position Scroll position as a percentage (0.0 = top, 1.0 = bottom)
     */
    fun setScroll(position: Float) {
        isScrolling = true
        scrollStopHandler.removeCallbacks(scrollStopRunnable)

        if (!isDragging) {
            Log.d("ScrollHandle", "setScroll called with position: $position")
            if (!shown()) {
                show()
            } else {
                handler.removeCallbacks(hidePageScrollerRunnable)
            }

            setPosition(position)

            // Update page information display
            val pdfView = securePdfView?.getChildAt(0) as? PdfView
            pdfView?.let { view ->
                val visiblePages = getVisiblePageRange(view)
                val totalPages = view.getPageCount()

                updatePageText(visiblePages.first, visiblePages.second, totalPages)
            }

            scrollStopHandler.postDelayed(scrollStopRunnable, 200) // Hide 200ms after scroll stops
        } else {
            Log.d("ScrollHandle", "setScroll called with position: $position")
        }
    }

    /**
     * Updates the page number display in the scroll handle bubble.
     *
     * @param pageNum The current page number (1-based)
     */
    fun setPageNum(pageNum: Int) {
        this.currentPage = pageNum

        val pdfView = securePdfView?.getChildAt(0) as? PdfView
        pdfView?.let { view ->
            val visiblePages = getVisiblePageRange(view)
            val totalPages = view.getPageCount()

            updatePageText(visiblePages.first, visiblePages.second, totalPages)
        }
    }

    /**
     * Updates scroll handle when document layout changes (zoom, page count, etc.).
     */
    fun updateForDocumentChange() {
        post {
            updateScrollThumbSize()
            updateComponentPositions()

            val pdfView = securePdfView?.getChildAt(0) as? PdfView
            this.pageCount = pdfView?.getPageCount() ?: 0
        }
    }

    // Visible page detection

    /**
     * Determines the range of visible pages based on viewport coverage and page sizes.
     *
     * For documents with short pages (less than 50% of screen height), this method will
     * detect and display page ranges (e.g., "2-4 / 20"). For documents with full-height
     * pages, it displays single page numbers (e.g., "3 / 20").
     *
     * @param pdfView The PDF view to analyze
     * @return Pair of (first visible page, last visible page) in 1-based numbering
     */
    private fun getVisiblePageRange(pdfView: PdfView): Pair<Int, Int> {
        return try {
            val currentPage = pdfView.getCurrentPage() + 1 // Convert to 1-based

            // When zoomed in, always show single page
            val currentZoom = pdfView.getCurrentZoomScale()
            if (currentZoom > 1.1f) {
                return Pair(currentPage, currentPage)
            }

            // Check if pages are short enough to warrant multi-page display
            val areShortPages = checkIfPagesAreShort(pdfView)
            if (!areShortPages) {
                return Pair(currentPage, currentPage)
            }

            // Calculate visible pages based on screen coverage
            val visiblePages = calculateSignificantlyVisiblePages(pdfView)

            if (visiblePages.size <= 1) {
                Pair(currentPage, currentPage)
            } else {
                val firstPage = (visiblePages.minOrNull() ?: (currentPage - 1)) + 1 // Convert to 1-based
                val lastPage = (visiblePages.maxOrNull() ?: (currentPage - 1)) + 1 // Convert to 1-based
                Pair(firstPage, lastPage)
            }

        } catch (e: Exception) {
            val fallbackPage = pdfView.getCurrentPage() + 1
            Pair(fallbackPage, fallbackPage)
        }
    }

    /**
     * Calculates which pages are significantly visible (>60% on screen).
     *
     * @param pdfView The PDF view to analyze
     * @return List of page numbers (0-based) that are significantly visible
     */
    private fun calculateSignificantlyVisiblePages(pdfView: PdfView): List<Int> {
        return try {
            val viewHeight = pdfView.viewHeight.toFloat()
            val scrollY = pdfView.getCurrentScrollY()
            val viewBottom = scrollY + viewHeight

            val visiblePages = mutableListOf<Int>()
            val pageCount = pdfView.getPageCount()

            for (pageNum in 0 until pageCount) {
                val pageVisibility =
                    calculatePageVisibilityPercentage(pdfView, pageNum, scrollY, viewBottom)

                if (pageVisibility > 0.6f) { // More than 60% visible
                    visiblePages.add(pageNum)
                }
            }

            if (visiblePages.isEmpty()) {
                visiblePages.add(pdfView.getCurrentPage())
            }

            visiblePages.sorted()
        } catch (e: Exception) {
            listOf(pdfView.getCurrentPage())
        }
    }

    /**
     * Calculates what percentage of a specific page is visible in the viewport.
     *
     * @param pdfView The PDF view
     * @param pageNum Page number to check (0-based)
     * @param viewTop Top edge of the viewport
     * @param viewBottom Bottom edge of the viewport
     * @return Percentage of page visible (0.0 to 1.0)
     */
    private fun calculatePageVisibilityPercentage(pdfView: PdfView, pageNum: Int, viewTop: Float, viewBottom: Float): Float {
        return try {
            val pageBounds = pdfView.getEstimatedPageBounds(pageNum)
                ?: return if (pageNum == pdfView.getCurrentPage()) 1.0f else 0.0f

            val pageTop = pageBounds.first
            val pageBottom = pageBounds.second
            val pageHeight = pageBottom - pageTop

            if (pageHeight <= 0) return 0f

            // Calculate intersection between page and viewport
            val intersectionTop = maxOf(viewTop, pageTop)
            val intersectionBottom = minOf(viewBottom, pageBottom)
            val intersectionHeight = maxOf(0f, intersectionBottom - intersectionTop)

            // Return percentage of page that's visible
            (intersectionHeight / pageHeight).coerceIn(0f, 1f)
        } catch (e: Exception) {
            if (pageNum == pdfView.getCurrentPage()) 1.0f else 0.0f
        }
    }

    /**
     * Checks if pages are short enough to warrant multi-page display.
     *
     * Pages are considered "short" if they occupy less than 50% of the screen height,
     * which means multiple pages could be visible simultaneously.
     *
     * @param pdfView The PDF view to analyze
     * @return True if pages are short enough for multi-page display
     */
    private fun checkIfPagesAreShort(pdfView: PdfView): Boolean {
        return try {
            val viewHeight = pdfView.viewHeight.toFloat()

            val pageBounds = pdfView.getEstimatedPageBounds(0) // Use first page as reference
            if (pageBounds != null) {
                val pageHeight = pageBounds.second - pageBounds.first
                pageHeight < (viewHeight * 0.5f) // Less than 50% of screen height
            } else {
                false
            }
        } catch (e: Exception) {
            false
        }
    }

    // Layout & Positioning

    /**
     * Updates the positions of all scroll handle components based on current layout.
     */
    private fun updateComponentPositions() {
        val width = this.width.toFloat()

        // Position scrollbar at the appropriate edge
        if (inverted) {
            scrollBar.x = edgeMargin.toFloat()
        } else {
            scrollBar.x = width - edgeMargin.toFloat() - scrollBarWidth
        }

        // Position thumb over scrollbar
        scrollThumb.x = scrollBar.x

        // Position bubble with proper margin
        updateBubblePosition()
    }

    /**
     * Updates the horizontal position of the page indicator bubble.
     */
    private fun updateBubblePosition() {
        if (inverted) {
            // Left side - bubble to the right of scrollbar
            bubbleView.x = scrollBar.x + scrollBarWidth + bubbleMargin
        } else {
            // Right side - bubble to the left of scrollbar
            bubbleView.x = scrollBar.x - bubbleView.width - bubbleMargin
        }
    }

    /**
     * Updates the scroll thumb size based on document length and viewport size.
     *
     * The thumb size represents the proportion of the document that's currently visible.
     * Longer documents have smaller thumbs, shorter documents have larger thumbs.
     */
    private fun updateScrollThumbSize() {
        val pdfViewHeight = securePdfView?.height ?: return

        val pdfView = securePdfView?.getChildAt(0) as? PdfView
        val totalDocHeight = pdfView?.getTotalDocumentHeight() ?: (pdfViewHeight.toFloat() * pageCount)

        val maxThumbHeight = pdfViewHeight * 0.2f // Max 20% of scroll bar height
        val minThumbHeight = scrollThumbMinHeight.toFloat()

        val thumbHeight = if (totalDocHeight > pdfViewHeight) {
            // Document is scrollable: thumb size represents visible portion
            val ratio = pdfViewHeight.toFloat() / totalDocHeight
            (pdfViewHeight * ratio).coerceIn(minThumbHeight, maxThumbHeight)
        } else {
            // Document fits on screen: use minimum thumb size
            minThumbHeight
        }.toInt()

        Log.d("ScrollHandle", "updateScrollThumbSize - pdfViewHeight: $pdfViewHeight, totalDocHeight: $totalDocHeight")
        Log.d("ScrollHandle", "updateScrollThumbSize - calculated thumbHeight: $thumbHeight")

        val thumbParams = scrollThumb.layoutParams
        thumbParams.height = thumbHeight
        scrollThumb.layoutParams = thumbParams
    }

    /**
     * Sets the position of the scroll thumb and bubble based on scroll percentage.
     *
     * @param position Scroll position as percentage (0.0 = top, 1.0 = bottom)
     */
    private fun setPosition(position: Float) {
        val scrollBarHeight = scrollBar.height.toFloat()
        val thumbHeight = scrollThumb.height.toFloat()
        val maxY = maxOf(0f, scrollBarHeight - thumbHeight)

        Log.d("ScrollHandle", "setPosition - position: $position, scrollBarHeight: $scrollBarHeight, thumbHeight: $thumbHeight, maxY: $maxY")

        // Position the scroll thumb vertically
        val thumbY = if (maxY > 0) {
            position * maxY
        } else {
            0f
        }
        val constrainedThumbY = if (maxY > 0f) {
            thumbY.coerceIn(0f, maxY)
        } else {
            0f
        }

        Log.d("ScrollHandle", "setPosition - calculated thumbY: $thumbY, constrained: $constrainedThumbY")

        scrollThumb.y = constrainedThumbY

        // Position the bubble vertically next to the thumb
        val bubbleY = if (maxY > 0f) {
            scrollThumb.y + (thumbHeight - bubbleView.height) / 2f
        } else {
            val bubbleMaxY = scrollBarHeight - bubbleView.height
            position * bubbleMaxY
        }
        bubbleView.y = bubbleY.coerceAtLeast(0f).coerceAtMost(scrollBarHeight - bubbleView.height)

        Log.d("ScrollHandle", "setPosition - final scrollThumb.y: ${scrollThumb.y}, bubbleView.y: ${bubbleView.y}")

        updateBubblePosition()
    }

    // Bubble management

    /**
     * Forces re-layout of the page indicator bubble after text changes.
     */
    private fun relayoutBubbleView() {
        bubbleView.measure(
            MeasureSpec.makeMeasureSpec(securePdfView?.width ?: 0, MeasureSpec.AT_MOST),
            MeasureSpec.makeMeasureSpec(bubbleHeight, MeasureSpec.EXACTLY)
        )
        bubbleView.layout(
            bubbleView.left,
            bubbleView.top,
            bubbleView.left + bubbleView.measuredWidth,
            bubbleView.top + bubbleView.measuredHeight
        )
    }

    /**
     * Updates the page text in the indicator bubble.
     *
     * @param startPage First page in the range (1-based)
     * @param endPage Last page in the range (1-based)
     * @param pageCount Total number of pages in the document
     */
    private fun updatePageText(startPage: Int, endPage: Int, pageCount: Int) {
        val text = if (startPage != endPage) {
            "$startPage-$endPage / $pageCount"
        } else {
            "$startPage / $pageCount"
        }

        bubbleView.setText(text)
        relayoutBubbleView()

        // Ensure bubble position is updated after size change
        post {
            updateBubblePosition()
        }
    }

    // Visibility management

    /**
     * Checks if the scroll handle is currently visible.
     *
     * @return True if the scroll handle is visible
     */
    fun shown(): Boolean = isVisible

    /**
     * Shows the scroll handle with proper component setup.
     */
    fun show() {
        visibility = VISIBLE
        updateScrollThumbSize()

        post { updateComponentPositions() }
    }

    /**
     * Hides the scroll handle immediately.
     */
    private fun hide() {
        visibility = INVISIBLE
    }

    /**
     * Hides the scroll handle after a delay, unless currently scrolling.
     */
    fun hideDelayed() {
        if (!isScrolling) {
            handler.removeCallbacks(hidePageScrollerRunnable)
            handler.postDelayed(hidePageScrollerRunnable, 1500)
        }
    }

    // Utility methods

    /**
     * Converts density-independent pixels to actual pixels.
     *
     * @param value Value in dp
     * @return Value in pixels
     */
    private fun dp(value: Float): Int = ViewUtils.dp(context, value)

    // View lifecycle callbacks

    override fun performClick(): Boolean {
        super.performClick()
        return true
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        Log.d("ScrollHandle", "onSizeChanged - ${oldw}x${oldh} -> ${w}x${h}")
        updateComponentPositions()
    }
}
