package com.mattermost.securepdfviewer.view.scrollhandle

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.util.AttributeSet
import android.view.View

/**
 * Custom view for the scroll handle thumb (the draggable part of the scrollbar).
 */
class ScrollThumbView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0,
    private val thumbColor: Int = 0xFF757575.toInt(),
    private val thumbWidth: Int = 6
) : View(context, attrs, defStyleAttr) {

    // Constructor for programmatic creation
    constructor(
        context: Context,
        thumbColor: Int,
        thumbWidth: Int
    ) : this(context, null, 0, thumbColor, thumbWidth)

    private val paint = Paint().apply {
        color = thumbColor
        isAntiAlias = true
    }

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

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        setMeasuredDimension(thumbWidth, MeasureSpec.getSize(heightMeasureSpec))
    }
}
