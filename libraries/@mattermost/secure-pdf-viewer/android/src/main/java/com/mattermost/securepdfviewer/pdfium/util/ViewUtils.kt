package com.mattermost.securepdfviewer.pdfium.util

import android.content.Context
import android.util.TypedValue

/**
 * Utility functions for view-related operations and UI calculations.
 *
 * This utility object provides essential conversion functions for working with
 * different Android measurement units, particularly for creating density-independent
 * user interfaces that work consistently across devices with varying screen densities.
 *
 * Android's display system uses multiple measurement units:
 * - **px (pixels)**: Physical screen pixels, varies by device density
 * - **dp (density-independent pixels)**: Abstract units based on 160 DPI reference
 * - **sp (scale-independent pixels)**: Similar to dp but scales with user font preferences
 *
 * The utility functions in this object handle the conversion between these units,
 * ensuring that UI elements maintain consistent physical sizes across different
 * devices while respecting user accessibility preferences.
 *
 * Common use cases:
 * - Converting design specifications (in dp) to pixel values for drawing
 * - Creating touch targets with consistent physical sizes
 * - Implementing spacing and padding that scales appropriately
 * - Building responsive layouts that work across device categories
 */
object ViewUtils {

    /**
     * Converts density-independent pixels (dp) to actual pixels based on device density.
     *
     * This function performs the fundamental conversion from abstract density-independent
     * units to concrete pixel values that can be used for drawing, positioning, and
     * measurement operations. It accounts for the device's screen density to ensure
     * that UI elements maintain consistent physical sizes across different devices.
     *
     * The conversion process:
     * 1. Retrieves the device's display metrics from the provided context
     * 2. Applies Android's density conversion algorithm
     * 3. Returns the pixel equivalent rounded to the nearest integer
     *
     * Usage examples:
     * - Converting margin specifications: `dp(context, 16f)` for 16dp margins
     * - Setting view dimensions: `dp(context, 48f)` for 48dp touch targets
     * - Defining spacing values: `dp(context, 8f)` for 8dp spacing
     *
     * @param context Android context containing display metrics information
     * @param value The value in density-independent pixels to convert
     * @return The equivalent value in actual screen pixels (rounded to integer)
     */
    fun dp(context: Context, value: Float): Int {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            value,
            context.resources.displayMetrics
        ).toInt()
    }

    /**
     * Converts density-independent pixels (dp) to actual pixels with floating-point precision.
     *
     * This function provides an alternative conversion method that preserves floating-point
     * precision in the result, useful for calculations that require sub-pixel accuracy
     * or when the result will be used in further mathematical operations before final
     * application.
     *
     * Key differences from the dp() function:
     * - **Input Type**: Accepts integer dp values for convenience
     * - **Output Precision**: Returns floating-point result without rounding
     * - **Use Cases**: Calculations requiring precision, animation values, touch calculations
     *
     * The function uses direct multiplication by the density factor, which is
     * computationally efficient and provides precise results for mathematical
     * operations that may involve multiple conversions or transformations.
     *
     * Common applications:
     * - Touch event coordinate calculations requiring precision
     * - Animation target calculations that need smooth interpolation
     * - Complex layout calculations involving multiple conversion steps
     * - Hit-testing operations where sub-pixel accuracy matters
     *
     * @param context Android context for accessing display density information
     * @param dp The value in density-independent pixels (as integer for convenience)
     * @return The equivalent value in actual screen pixels (as floating-point)
     */
    fun dpToPx(context: Context, dp: Int): Float {
        return dp * context.resources.displayMetrics.density
    }
}
