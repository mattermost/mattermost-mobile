package com.mattermost.securepdfviewer.mupdf.gesture

import android.util.Log
import android.view.GestureDetector
import android.view.MotionEvent
import com.mattermost.securepdfviewer.mupdf.MuPDFView
import com.mattermost.securepdfviewer.mupdf.interaction.ZoomAnimator.Companion.MIN_ZOOM_SCALE
import kotlin.math.abs

/**
 * Gesture listener for scroll handling with link tap detection and double tap zoom.
 *
 * Handles all single-touch gestures including scrolling, flinging, tapping,
 * and double-tap zoom while maintaining proper interaction with the zoom system.
 */
internal class ScrollGestureListener(
    private val view: MuPDFView
) : GestureDetector.SimpleOnGestureListener() {

    companion object {
        private const val TAG = "ScrollGestureListener"
    }

    // Fling state management
    var isCustomFlinging = false
        private set

    var flingVelocity = 0f
        private set

    var flingStartTime = 0L
        private set

    internal val flingDeceleration = 2000f

    fun stopCustomFlinging() {
        isCustomFlinging = false
    }

    override fun onDown(e: MotionEvent): Boolean {
        // Stop any ongoing fling/scroll animation when user touches
        if (!view.scroller.isFinished) {
            view.scroller.abortAnimation()
        }

        // Stop custom fling
        if (isCustomFlinging) {
            isCustomFlinging = false
        }

        return true
    }

    override fun onSingleTapConfirmed(e: MotionEvent): Boolean {
        // Handle link taps first, then general taps
        val linkHandled = view.linkHandler.handleLinkTap(e.x, e.y)

        if (!linkHandled) {
            view.onTap?.invoke(e)
        }

        return true
    }

    override fun onDoubleTap(e: MotionEvent): Boolean {
        view.zoomAnimator.handleDoubleTapZoom(e.x, e.y)
        return true
    }

    override fun onScroll(
        e1: MotionEvent?,
        e2: MotionEvent,
        distanceX: Float,
        distanceY: Float
    ): Boolean {
        if (view.zoomAnimator.isZooming) return true

        // Scale vertical distance for consistent feel across zoom levels
        val adjustedDistanceY = distanceY / view.zoomAnimator.currentZoomScale
        view.scrollHandler.scrollY += adjustedDistanceY

        // Handle horizontal scrolling when zoomed
        if (view.zoomAnimator.currentZoomScale > MIN_ZOOM_SCALE + 0.1f) {
            view.scrollHandler.scrollX += distanceX
            view.scrollHandler.constrainHorizontalScroll()
        } else {
            view.scrollHandler.scrollX = 0f
        }

        val maxScroll = maxOf(0f, view.scrollHandler.totalDocumentHeight - view.height)
        view.scrollHandler.scrollY = view.scrollHandler.scrollY.coerceIn(0f, maxScroll)

        view.scrollHandler.updateScrollHandleImmediate()

        view.invalidate()
        return true
    }

    override fun onFling(
        e1: MotionEvent?,
        e2: MotionEvent,
        velocityX: Float,
        velocityY: Float
    ): Boolean {
        if (view.zoomAnimator.isZooming) return true

        // Stop any existing fling
        view.scroller.forceFinished(true)
        isCustomFlinging = false

        // Handle fling based on zoom state and velocity direction
        if (view.zoomAnimator.currentZoomScale > MIN_ZOOM_SCALE + 0.1f && abs(velocityX) > abs(velocityY)) {
            // Horizontal fling when zoomed
            val maxPageWidth = view.layoutCalculator.getMaxPageWidth()
            val effectiveZoom = view.zoomAnimator.baseZoom * view.zoomAnimator.currentZoomScale
            val scaledContentWidth = maxPageWidth * effectiveZoom
            val overflowWidth = scaledContentWidth - view.width

            if (overflowWidth > 0f) {
                val maxHorizontalScroll = overflowWidth / 2f

                view.scroller.fling(
                    view.scrollHandler.scrollX.toInt(), 0,
                    (-velocityX).toInt(), 0, // Flip X velocity, no Y velocity
                    (-maxHorizontalScroll).toInt(), maxHorizontalScroll.toInt(),
                    0, 0
                )
                view.invalidate()
                return true
            }
        }

        // Vertical fling
        val initialVelocity = -velocityY
        if (abs(initialVelocity) > 100) {
            startCustomFling(initialVelocity)
        }

        return true
    }

    /**
     * Starts a custom fling animation with consistent deceleration.
     *
     * @param initialVelocity Starting velocity in pixels per second
     */
    private fun startCustomFling(initialVelocity: Float) {
        isCustomFlinging = true
        flingVelocity = initialVelocity
        flingStartTime = System.currentTimeMillis()

        Log.d(TAG, "Starting custom fling with velocity: $flingVelocity")
        view.invalidate()
    }
}
