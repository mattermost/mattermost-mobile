package com.mattermost.securepdfviewer.view.scrollhandle

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Rect
import android.util.AttributeSet
import android.util.Log
import android.util.TypedValue
import android.view.View

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

    constructor(
        context: Context,
        backgroundColor: Int,
        textColor: Int,
        cornerRadius: Float,
        horizontalPadding: Int,
        viewHeight: Int
    ) : this(context, null, 0, backgroundColor, textColor, cornerRadius, horizontalPadding, viewHeight)

    private val textPaint = Paint().apply {
        color = textColor
        isAntiAlias = true
        textSize = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, 12f, resources.displayMetrics)
        textAlign = Paint.Align.CENTER
    }

    private val backgroundPaint = Paint().apply {
        color = backgroundColor
        isAntiAlias = true
        style = Paint.Style.FILL
    }

    private val borderPaint = Paint().apply {
        color = 0x20000000
        isAntiAlias = true
        style = Paint.Style.STROKE
        strokeWidth = ViewUtils.dp(context,0.5f).toFloat()
    }

    // Text content and measurements
    private var text = ""
    private var measuredTextWidth = 0f
    private val textBounds = Rect()

    init {
        // Set initial shadow/elevation
        elevation = ViewUtils.dp(context,2f).toFloat()
    }

    fun setText(newText: String) {
        if (text != newText) {
            text = newText
            // Measure new text dimensions
            textPaint.getTextBounds(text, 0, text.length, textBounds)

            requestLayout() // <== Triggers remeasurement
            invalidate() // <== Redraw with new text
        }
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        Log.d("BubbleView", "onMeasure called with spec: ${MeasureSpec.toString(widthMeasureSpec)}")

        // Get text dimensions
        measuredTextWidth = textPaint.measureText(text)

        // Calculate width needed for text plus padding
        val desiredWidth = (measuredTextWidth + horizontalPadding * 2).toInt()

        // Use fixed height but calculate width based on text
        setMeasuredDimension(desiredWidth, viewHeight)
    }

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

        // Draw border
        canvas.drawRoundRect(
            0f,
            0f,
            width.toFloat(),
            height.toFloat(),
            cornerRadius,
            cornerRadius,
            borderPaint
        )

        // Draw text centered in the bubble
        val textX = width / 2f
        val textY = height / 2f - textBounds.exactCenterY()
        canvas.drawText(text, textX, textY, textPaint)
    }
}
