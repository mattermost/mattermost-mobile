package com.mattermost.securepdfviewer.view.scrollhandle

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.util.AttributeSet
import android.view.View

/**
 * Custom view representing the scroll bar track.
 */
class ScrollBarView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0,
    private val barColor: Int = 0xFFE0E0E0.toInt(),
    private val barWidth: Int = 4
) : View(context, attrs, defStyleAttr) {

    constructor(
        context: Context,
        barColor: Int,
        barWidth: Int
    ) : this(context, null, 0, barColor, barWidth)

    private val paint = Paint().apply {
        color = barColor
        isAntiAlias = true
    }

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

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        setMeasuredDimension(barWidth, MeasureSpec.getSize(heightMeasureSpec))
    }
}
