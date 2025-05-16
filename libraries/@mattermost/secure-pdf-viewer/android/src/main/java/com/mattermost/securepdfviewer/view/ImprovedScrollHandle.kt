package com.mattermost.securepdfviewer.view

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.view.MotionEvent
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.core.view.isVisible
import com.github.barteksc.pdfviewer.PDFView
import com.github.barteksc.pdfviewer.scroll.ScrollHandle
import com.mattermost.securepdfviewer.view.scrollhandle.BubbleView
import com.mattermost.securepdfviewer.view.scrollhandle.ScrollBarView
import com.mattermost.securepdfviewer.view.scrollhandle.ScrollThumbView
import com.mattermost.securepdfviewer.view.scrollhandle.ViewUtils

class ImprovedScrollHandle @JvmOverloads constructor(
    private val context: Context,
    private val inverted: Boolean = false
) : FrameLayout(context), ScrollHandle {

    private var pdfView: PDFView? = null
    private var currentPage = 0
    private var pageCount = 0
    private var isDragging = false

    private val handler = Handler(Looper.getMainLooper())
    private val hidePageScrollerRunnable = Runnable { hide() }

    // UI components
    private val bubbleView: BubbleView
    private val scrollBar: ScrollBarView
    private val scrollThumb: ScrollThumbView

    // Customization
    private val bubbleBackgroundColor = 0xFFF5F5F5.toInt() // Light Gray
    private val scrollBarColor = 0xFFE0E0E0.toInt() // Light Gray
    private val scrollThumbColor = 0xFF757575.toInt() // Dark Gray
    private val textColor = 0xFF333333.toInt() // Dark Gray

    // Sizes
    private val bubblePaddingHorizontal = dp(12f)
    private val bubbleHeight = dp(32f) // Fixed height
    private val bubbleCornerRadius = dp(16f)
    private val scrollBarWidth = dp(4f)
    private val scrollThumbWidth = dp(6f)
    private val scrollThumbMinHeight = dp(48f)
    private val edgeMargin = dp(0f)
    private val bubbleMargin = dp(4f)

    init {
        visibility = INVISIBLE
        clipChildren = false
        clipToPadding = false

        // Create scroll bar
        scrollBar = ScrollBarView(context, scrollBarColor, scrollBarWidth)
        val scrollBarParams = LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.MATCH_PARENT)
        addView(scrollBar, scrollBarParams)

        // Create scroll thumb
        scrollThumb = ScrollThumbView(context, scrollThumbColor, scrollThumbWidth)
        addView(scrollThumb, LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
            if (inverted) {
                leftMargin = dp(4f)
            } else {
                rightMargin = dp(4f)
            }
        })

        // Create bubble view
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

    private fun dp(value: Float): Int = ViewUtils.dp(context, value)

    private fun updateComponentPositions() {
        val width = this.width.toFloat()

        // Position scrollbar at the edge
        if (inverted) {
            // Left side
            scrollBar.x = edgeMargin.toFloat()
        } else {
            // Right side
            scrollBar.x = width - edgeMargin.toFloat() - scrollBarWidth
        }

        // Position thumb over scrollbar
        scrollThumb.x = scrollBar.x

        // Position bubble with proper margin
        updateBubblePosition()
    }

    private fun updateBubblePosition() {
        if (inverted) {
            // Left side - bubble to the right of scrollbar
            bubbleView.x = scrollBar.x + scrollBarWidth + bubbleMargin
        } else {
            // Right side - bubble to the left of scrollbar
            bubbleView.x = scrollBar.x - bubbleView.width - bubbleMargin
        }
    }

    override fun setupLayout(pdfView: PDFView) {
        val layoutParams = LayoutParams(
            LayoutParams.MATCH_PARENT, // Changed to MATCH_PARENT for full width
            LayoutParams.MATCH_PARENT
        )
        layoutParams.setMargins(0, dp(12f), 0, dp(12f))

        pdfView.addView(this, layoutParams)
        this.pdfView = pdfView
        this.pageCount = pdfView.pageCount

        post {
            updateComponentPositions()
            updateScrollThumbSize()
        }
    }

    private fun updateScrollThumbSize() {
        val pdfViewHeight = pdfView?.height ?: return
        val viewableRatio = 1f / pageCount.coerceAtLeast(1)
        val thumbHeight = (pdfViewHeight * viewableRatio).coerceAtLeast(scrollThumbMinHeight.toFloat()).toInt()

        val thumbParams = scrollThumb.layoutParams
        thumbParams.height = thumbHeight
        scrollThumb.layoutParams = thumbParams
    }

    override fun destroyLayout() {
        pdfView?.removeView(this)
    }

    override fun setScroll(position: Float) {
        if (!isDragging) {
            if (!shown()) {
                show()
            } else {
                handler.removeCallbacks(hidePageScrollerRunnable)
            }

            setPosition(position)

            // Get current page from PDFView
            pdfView?.let { pdfView ->
                // Attempt to detect multiple visible pages
                val rangeInfo = determineVisiblePageRange(pdfView)
                updatePageText(rangeInfo.first, rangeInfo.second, pageCount)
            }

            hideDelayed()
        }
    }

    private fun determineVisiblePageRange(pdfView: PDFView): Pair<Int, Int> {
        val currentPage = pdfView.currentPage + 1 // 0-based to 1-based

        try {
            // Get current vertical offset
            val currentOffset = pdfView.currentYOffset
            val viewHeight = pdfView.height
            val zoom = pdfView.zoom


            // Get size of first page, accounting for zoom level
            val firstPageSize = pdfView.pdfFile.getPageSize(0) // first page
            val zoomedFirstPageHeight = firstPageSize.height * zoom

            // Use 5dp worth of pixels as the threshold to account for different screen densities
            val topThreshold = zoomedFirstPageHeight * 0.5f

            // Special case: if we're near the top of the document
            if (currentOffset >= 0 || Math.abs(currentOffset) < topThreshold) {
                // We're at the top, so first page must be visible
                var lastVisiblePage = 1

                // If first page is small, second page might be visible too
                if (zoomedFirstPageHeight < viewHeight * 0.5f && pdfView.pageCount > 1) {
                    lastVisiblePage = 2
                }

                return Pair(1, lastVisiblePage)
            }

            // Get size of current page
            val currentPageSize = pdfView.pdfFile.getPageSize(currentPage - 1)
            val zoomPageHeight = currentPageSize.height * zoom

            val pageHeightRatio = zoomPageHeight / viewHeight

            // check if we're showing multiple pages
            var lastVisiblePage = currentPage

            if (pageHeightRatio < 0.5F && currentPage < pdfView.pageCount) {
                // Calculate the page offset
                val pageOffset = -currentOffset

                // If the page offset is such that we see beyond the current page,
                // then the next page is partially visible
                if (pageOffset + viewHeight > zoomPageHeight) {
                    lastVisiblePage = currentPage + 1
                }
            }

            return Pair(currentPage, lastVisiblePage)
        } catch (e: Exception) {
            // Fallback to simple detection
            return Pair(currentPage, currentPage)
        }
    }

    private fun relayoutBubbleView() {
        bubbleView.measure(
            MeasureSpec.makeMeasureSpec(pdfView!!.width, MeasureSpec.AT_MOST),
            MeasureSpec.makeMeasureSpec(bubbleHeight, MeasureSpec.EXACTLY)
        )
        bubbleView.layout(
            bubbleView.left,
            bubbleView.top,
            bubbleView.left + bubbleView.measuredWidth,
            bubbleView.top + bubbleView.measuredHeight
        )
    }

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

    override fun shown(): Boolean {
        return isVisible
    }

    override fun show() {
        visibility = VISIBLE
        updateScrollThumbSize()

        post { updateComponentPositions() }
    }

    override fun hide() {
        visibility = INVISIBLE
    }

    override fun hideDelayed() {
        handler.removeCallbacks(hidePageScrollerRunnable)
        handler.postDelayed(hidePageScrollerRunnable, 1500)
    }

    private fun setPosition(position: Float) {
        val scrollBarHeight = scrollBar.height.toFloat()
        val thumbHeight = scrollThumb.height.toFloat()
        val maxY = scrollBarHeight - thumbHeight

        // Position the thumb vertically
        scrollThumb.y = limit(position * scrollBarHeight - thumbHeight / 2, 0f, maxY)

        // Position the bubble vertically next to the thumb
        bubbleView.y = scrollThumb.y + (thumbHeight - bubbleView.height) / 2

        updateBubblePosition()
    }

    private fun limit(value: Float, min: Float, max: Float): Float {
        return when {
            value < min -> min
            value > max -> max
            else -> value
        }
    }

    override fun setPageNum(pageNum: Int) {
        this.currentPage = pageNum

        pdfView?.let { pdfView ->
            val rangeInfo = determineVisiblePageRange(pdfView)
            updatePageText(rangeInfo.first, rangeInfo.second, pageCount)
        } ?: updatePageText(pageNum, pageNum, pageCount)
    }

    override fun performClick(): Boolean {
        super.performClick()
        return true
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        if (pdfView == null) {
            return super.onTouchEvent(event)
        }

        when (event.action) {
            MotionEvent.ACTION_DOWN -> {
                // Start dragging
                pdfView?.stopFling()
                handler.removeCallbacks(hidePageScrollerRunnable)

                // Only start dragging if we touch near the scrollbar
                val touchX = event.x
                val touchableArea = dp(40f) // Wider touchable area

                if ((inverted && touchX < touchableArea) ||
                    (!inverted && touchX > width - touchableArea)) {
                    isDragging = true
                    bubbleView.animate().alpha(1f).setDuration(200).start()

                    // Process this initial touch as a move
                    handleTouchMove(event.y)
                    return true
                }
                return false
            }
            MotionEvent.ACTION_MOVE -> {
                if (isDragging) {
                    handleTouchMove(event.y)
                    return true
                }
                return false
            }
            MotionEvent.ACTION_CANCEL, MotionEvent.ACTION_UP -> {
                if (isDragging) {
                    isDragging = false
                    hideDelayed()
                    return true
                }
                return false
            }
        }

        performClick()
        return super.onTouchEvent(event)
    }

    private fun handleTouchMove(y: Float) {
        val scrollBarHeight = scrollBar.height.toFloat()

        // Calculate percentage based on the scrollbar position
        val percentage = limit(y / scrollBarHeight, 0f, 1f)

        // Update PDF position
        pdfView?.setPositionOffset(if (inverted) 1 - percentage else percentage, false)
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        updateComponentPositions()
    }
}
