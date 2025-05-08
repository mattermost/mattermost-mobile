package com.mattermost.securepdfviewer.view.scrollhandle

import android.content.Context
import android.util.TypedValue

/**
 * Utility functions for view-related operations.
 */
object ViewUtils {
    /**
     * Convert dp value to pixels based on device density.
     *
     * @param context The context to get the display metrics
     * @param value The value in dp
     * @return The equivalent value in pixels
     */
    fun dp(context: Context, value: Float): Int {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            value,
            context.resources.displayMetrics
        ).toInt()
    }
}
