package com.mattermost.securepdfviewer.view.scrollhandle

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.util.AttributeSet
import android.view.View

/**
 * Custom view representing the visual track component of the scroll handle system.
 *
 * This view renders the static background track that provides visual context for
 * the scroll thumb position within the document. It serves as the foundation element
 * of the scroll handle UI, creating a subtle visual guide that helps users understand
 * their current position within the PDF document.
 *
 * Design characteristics:
 * - **Minimal Visual Weight**: Subtle color to avoid drawing attention from content
 * - **Rounded Aesthetics**: Smooth rounded ends for modern, polished appearance
 * - **Consistent Width**: Fixed width provides stable visual reference
 * - **Full Height**: Spans the entire scrollable area for complete context
 * - **Anti-aliased Rendering**: Smooth edges on all screen densities
 *
 * The scroll bar track works in conjunction with ScrollThumbView to create a
 * complete scroll position indicator, similar to modern scrollbar implementations
 * found in desktop applications and mobile interfaces.
 *
 * @param context Android context for resource access and display metrics
 * @param attrs XML attributes for view configuration (optional)
 * @param defStyleAttr Default style attribute for theming (optional)
 * @param barColor Color of the scroll bar track (default: light gray)
 * @param barWidth Width of the scroll bar in pixels (default: 4)
 */
class ScrollBarView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0,
    private val barColor: Int = 0xFFE0E0E0.toInt(),
    private val barWidth: Int = 4
) : View(context, attrs, defStyleAttr) {

    /**
     * Alternative constructor for programmatic creation with custom styling.
     *
     * This constructor enables creation of scroll bar instances with specific
     * visual characteristics when building the scroll handle system programmatically
     * rather than through XML inflation.
     *
     * @param context Android context for resource access
     * @param barColor Custom color for the scroll bar track
     * @param barWidth Custom width for the scroll bar in pixels
     */
    constructor(
        context: Context,
        barColor: Int,
        barWidth: Int
    ) : this(context, null, 0, barColor, barWidth)

    /**
     * Paint object configured for optimal scroll bar rendering.
     *
     * Pre-configured with anti-aliasing for smooth appearance and the specified
     * color for consistent visual styling throughout the scroll handle system.
     */
    private val paint = Paint().apply {
        color = barColor
        isAntiAlias = true
    }

    /**
     * Renders the scroll bar track as a rounded rectangle.
     *
     * This method draws the visual representation of the scroll track using
     * rounded rectangle geometry. The rounded ends provide a modern, polished
     * appearance that integrates well with contemporary UI design patterns.
     *
     * The track spans the full height of its container and uses the configured
     * width, creating a consistent visual guide for scroll position indication.
     * The corner radius is calculated as half the bar width to create perfect
     * semicircular ends regardless of the configured width.
     *
     * @param canvas Canvas object for drawing the scroll bar track
     */
    override fun onDraw(canvas: Canvas) {
        canvas.drawRoundRect(
            0f,
            0f,
            barWidth.toFloat(),
            height.toFloat(),
            barWidth / 2f,
            barWidth / 2f,
            paint
        )
    }

    /**
     * Measures the scroll bar dimensions based on configuration and parent constraints.
     *
     * This method implements a simple measurement strategy where the width is
     * fixed based on the configured bar width, while the height is determined
     * by the parent container's height specification. This ensures the scroll
     * bar maintains consistent visual width while adapting to different document
     * lengths and screen sizes.
     *
     * The measurement approach:
     * - **Fixed Width**: Uses configured barWidth for consistent appearance
     * - **Dynamic Height**: Adapts to parent container's height requirements
     * - **Simple Layout**: No complex calculations needed for this static element
     *
     * @param widthMeasureSpec Width measurement specification from parent
     * @param heightMeasureSpec Height measurement specification from parent
     */
    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        setMeasuredDimension(barWidth, MeasureSpec.getSize(heightMeasureSpec))
    }
}
