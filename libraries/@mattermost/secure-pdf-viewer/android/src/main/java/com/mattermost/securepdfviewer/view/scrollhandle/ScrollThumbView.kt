package com.mattermost.securepdfviewer.view.scrollhandle

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.util.AttributeSet
import android.view.View

/**
 * Custom view representing the interactive thumb component of the scroll handle system.
 *
 * This view renders the movable indicator that shows the current scroll position within
 * the PDF document and provides the visual target for user drag interactions. The thumb
 * serves as both a position indicator and an interactive element that users can drag
 * to quickly navigate through the document.
 *
 * Key characteristics:
 * - **Interactive Element**: Primary target for user touch and drag operations
 * - **Position Indicator**: Visual representation of current scroll position
 * - **Dynamic Sizing**: Height adjusts based on document length and viewport ratio
 * - **Enhanced Visibility**: Slightly wider and darker than track for clear distinction
 * - **Smooth Movement**: Positioned dynamically by parent scroll handle controller
 * - **Touch Accessibility**: Sized appropriately for comfortable touch interaction
 *
 * The thumb works in conjunction with ScrollBarView to create a complete scrollbar
 * interface. While the track provides static context, the thumb provides dynamic
 * position feedback and enables direct manipulation of the scroll position.
 *
 * Visual hierarchy:
 * - Positioned above the scroll bar track (higher z-order)
 * - Slightly wider than the track for enhanced visibility
 * - Darker color for clear contrast against the track
 * - Rounded design matching the overall scroll handle aesthetic
 *
 * @param context Android context for resource access and display metrics
 * @param attrs XML attributes for view configuration (optional)
 * @param defStyleAttr Default style attribute for theming (optional)
 * @param thumbColor Color of the scroll thumb (default: medium gray)
 * @param thumbWidth Width of the scroll thumb in pixels (default: 6)
 */
class ScrollThumbView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0,
    private val thumbColor: Int = 0xFF757575.toInt(),
    private val thumbWidth: Int = 6
) : View(context, attrs, defStyleAttr) {

    /**
     * Alternative constructor for programmatic creation with custom styling.
     *
     * This constructor enables creation of scroll thumb instances with specific
     * visual characteristics when building the scroll handle system programmatically.
     * Useful for dynamic theming or when creating multiple scroll handles with
     * different visual styles.
     *
     * @param context Android context for resource access
     * @param thumbColor Custom color for the scroll thumb
     * @param thumbWidth Custom width for the scroll thumb in pixels
     */
    constructor(
        context: Context,
        thumbColor: Int,
        thumbWidth: Int
    ) : this(context, null, 0, thumbColor, thumbWidth)

    /**
     * Paint object optimized for scroll thumb rendering.
     *
     * Configured with anti-aliasing for smooth appearance and the specified
     * thumb color for clear visual distinction from the background track.
     * The paint settings ensure consistent, high-quality rendering across
     * different screen densities and orientations.
     */
    private val paint = Paint().apply {
        color = thumbColor
        isAntiAlias = true
    }

    /**
     * Renders the scroll thumb as a rounded rectangle indicator.
     *
     * This method draws the visual representation of the scroll position using
     * rounded rectangle geometry that matches the overall scroll handle design
     * language. The thumb is designed to be clearly visible against the track
     * while maintaining visual harmony with the overall interface.
     *
     * The rendering approach:
     * - **Rounded Corners**: Semicircular ends for modern, polished appearance
     * - **Full Height Usage**: Utilizes the dynamically calculated height
     * - **Anti-aliased**: Smooth edges for professional appearance
     * - **Consistent Width**: Fixed width for predictable touch target size
     *
     * The height of the thumb is determined by the parent scroll handle based
     * on the ratio of viewport size to total document size, providing intuitive
     * visual feedback about the document length and current position.
     *
     * @param canvas Canvas object for drawing the scroll thumb
     */
    override fun onDraw(canvas: Canvas) {
        canvas.drawRoundRect(
            0f,
            0f,
            thumbWidth.toFloat(),
            height.toFloat(),
            thumbWidth / 2f,
            thumbWidth / 2f,
            paint
        )
    }

    /**
     * Measures the scroll thumb dimensions based on configuration and parent requirements.
     *
     * This method implements a measurement strategy where the width is fixed for
     * consistent touch interaction, while the height is dynamically determined
     * by the parent scroll handle based on document characteristics and viewport
     * proportions.
     *
     * Measurement strategy:
     * - **Fixed Width**: Maintains consistent width for reliable touch targets
     * - **Dynamic Height**: Adapts to represent document-to-viewport ratio
     * - **Parent-Driven**: Height specification comes from scroll handle controller
     * - **Touch Optimized**: Width sized for comfortable finger interaction
     *
     * The parent scroll handle calculates the appropriate thumb height based on
     * the ratio of visible content to total document length, creating intuitive
     * visual feedback about document size and scroll position.
     *
     * @param widthMeasureSpec Width measurement specification from parent
     * @param heightMeasureSpec Height measurement specification from parent
     */
    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        setMeasuredDimension(thumbWidth, MeasureSpec.getSize(heightMeasureSpec))
    }
}
