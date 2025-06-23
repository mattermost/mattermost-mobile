package com.mattermost.securepdfviewer.view.scrollhandle

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Rect
import android.util.AttributeSet
import android.util.Log
import android.util.TypedValue
import android.view.View
import com.mattermost.securepdfviewer.pdfium.util.ViewUtils

/**
 * Custom view that displays a floating bubble with page information in the scroll handle.
 *
 * This view creates an elegant, rounded bubble that appears next to the scroll handle
 * to show the current page number and total page count. It's designed to provide
 * clear visual feedback during document navigation while maintaining a clean,
 * modern appearance consistent with material design principles.
 *
 * Key features:
 * - **Dynamic Sizing**: Automatically adjusts width based on text content length
 * - **Rounded Design**: Smooth rounded corners for modern visual appeal
 * - **Elevation Shadow**: Subtle shadow to create depth and visual separation
 * - **Customizable Styling**: Configurable colors, padding, and corner radius
 * - **Performance Optimized**: Efficient text measurement and drawing
 * - **Accessibility Ready**: Clear contrast and readable typography
 *
 * The bubble displays text in formats like "5 / 20" for single pages or "3-5 / 20"
 * for page ranges when multiple pages are visible simultaneously.
 *
 * @param context Android context for resource access and theming
 * @param attrs XML attributes for view configuration (optional)
 * @param defStyleAttr Default style attribute for theming (optional)
 * @param backgroundColor Background color of the bubble (default: light gray)
 * @param textColor Color of the text content (default: dark gray)
 * @param cornerRadius Radius for rounded corners in pixels (default: 16f)
 * @param horizontalPadding Internal padding on left/right sides in pixels (default: 16)
 * @param viewHeight Fixed height of the bubble in pixels (default: 32)
 */
class BubbleView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0,
    private val backgroundColor: Int = 0xFFF5F5F5.toInt(),
    private val textColor: Int = 0xFF333333.toInt(),
    private val cornerRadius: Float = 16f,
    private val horizontalPadding: Int = 16,
    private val viewHeight: Int = 32
) : View(context, attrs, defStyleAttr) {

    /**
     * Alternative constructor for programmatic creation with custom styling.
     *
     * This constructor allows complete customization of the bubble's appearance
     * when creating instances programmatically rather than through XML inflation.
     */
    constructor(
        context: Context,
        backgroundColor: Int,
        textColor: Int,
        cornerRadius: Float,
        horizontalPadding: Int,
        viewHeight: Int
    ) : this(context, null, 0, backgroundColor, textColor, cornerRadius, horizontalPadding, viewHeight)

    // Drawing and styling components

    /**
     * Paint object for rendering text content with optimized settings for readability.
     */
    private val textPaint = Paint().apply {
        color = textColor
        isAntiAlias = true
        textSize = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, 12f, resources.displayMetrics)
        textAlign = Paint.Align.CENTER
    }

    /**
     * Paint object for drawing the bubble's background with smooth anti-aliasing.
     */
    private val backgroundPaint = Paint().apply {
        color = backgroundColor
        isAntiAlias = true
        style = Paint.Style.FILL
    }

    /**
     * Paint object for drawing the subtle border around the bubble for definition.
     */
    private val borderPaint = Paint().apply {
        color = 0x20000000
        isAntiAlias = true
        style = Paint.Style.STROKE
        strokeWidth = ViewUtils.dp(context,0.5f).toFloat()
    }

    // Text content management

    /**
     * Current text content displayed in the bubble.
     */
    private var text = ""

    /**
     * Measured width of the current text for layout calculations.
     */
    private var measuredTextWidth = 0f

    /**
     * Text bounds rectangle for precise text positioning.
     */
    private val textBounds = Rect()

    init {
        // Apply elevation for material design shadow effect
        elevation = ViewUtils.dp(context,2f).toFloat()
    }

    // Text content updates

    /**
     * Updates the text content displayed in the bubble.
     *
     * This method efficiently updates the bubble's text content, triggering
     * re-measurement and redrawing only when the text actually changes. This
     * optimization prevents unnecessary layout passes during scrolling when
     * the same page information is repeatedly set.
     *
     * The method handles the complete update cycle:
     * 1. Text change detection to avoid unnecessary updates
     * 2. Text measurement for accurate layout calculations
     * 3. Layout request to adjust bubble width for new content
     * 4. Invalidation to trigger visual redraw
     *
     * @param newText The new text to display (e.g., "5 / 20" or "3-5 / 20")
     */
    fun setText(newText: String) {
        if (text != newText) {
            text = newText
            // Measure new text dimensions for accurate layout
            textPaint.getTextBounds(text, 0, text.length, textBounds)

            requestLayout() // Triggers re-measurement for new text width
            invalidate() // Triggers redraw with new text content
        }
    }

    // View measurement and layout

    /**
     * Measures the required dimensions for the bubble based on text content.
     *
     * This method implements dynamic width calculation while maintaining a fixed
     * height. The width is determined by the text content plus horizontal padding,
     * ensuring the bubble always perfectly fits its content without truncation
     * or excessive whitespace.
     *
     * The measurement process:
     * 1. Calculates actual text width using the configured paint settings
     * 2. Adds horizontal padding to determine total required width
     * 3. Uses fixed height for consistent visual alignment
     * 4. Sets measured dimensions for the layout system
     *
     * @param widthMeasureSpec Width measurement specification from parent
     * @param heightMeasureSpec Height measurement specification from parent
     */
    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        Log.d("BubbleView", "onMeasure called with spec: ${MeasureSpec.toString(widthMeasureSpec)}")

        // Calculate exact text width for precise bubble sizing
        measuredTextWidth = textPaint.measureText(text)

        // Determine total width needed including padding
        val desiredWidth = (measuredTextWidth + horizontalPadding * 2).toInt()

        // Set final dimensions: dynamic width, fixed height
        setMeasuredDimension(desiredWidth, viewHeight)
    }

    // Visual rendering

    /**
     * Renders the bubble with background, border, and text content.
     *
     * This method performs the complete visual rendering of the bubble using
     * a layered approach for optimal visual quality. The rendering order
     * ensures proper visual hierarchy and clean appearance.
     *
     * Rendering layers:
     * 1. **Background**: Rounded rectangle with configured background color
     * 2. **Border**: Subtle outline for visual definition and separation
     * 3. **Text**: Centered page information with optimized typography
     *
     * All drawing operations use anti-aliasing for smooth, professional
     * appearance on all screen densities.
     *
     * @param canvas Canvas object for drawing operations
     */
    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        // Draw rounded rectangle background
        canvas.drawRoundRect(
            0f,
            0f,
            width.toFloat(),
            height.toFloat(),
            cornerRadius,
            cornerRadius,
            backgroundPaint
        )

        // Draw subtle border for visual definition
        canvas.drawRoundRect(
            0f,
            0f,
            width.toFloat(),
            height.toFloat(),
            cornerRadius,
            cornerRadius,
            borderPaint
        )

        // Draw text content centered within the bubble
        val textX = width / 2f
        val textY = height / 2f - textBounds.exactCenterY()
        canvas.drawText(text, textX, textY, textPaint)
    }
}
