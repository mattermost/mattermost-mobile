package com.mattermost.rnutils.helpers

import android.app.Activity
import android.graphics.Rect
import androidx.window.core.layout.WindowHeightSizeClass
import androidx.window.core.layout.WindowSizeClass
import androidx.window.core.layout.WindowWidthSizeClass
import androidx.window.layout.FoldingFeature
import androidx.window.layout.WindowInfoTracker
import androidx.window.layout.WindowLayoutInfo
import androidx.window.layout.WindowMetricsCalculator
import androidx.window.rxjava3.layout.windowLayoutInfoObservable
import io.reactivex.rxjava3.android.schedulers.AndroidSchedulers
import io.reactivex.rxjava3.core.Observable
import io.reactivex.rxjava3.disposables.Disposable
import java.lang.ref.WeakReference

class FoldableObserver(activity: Activity) {
    private var disposable: Disposable? = null
    private lateinit var observable: Observable<WindowLayoutInfo>
    var isDeviceFolded: Boolean = false
    private val activityRef = WeakReference(activity)
    private var windowBounds: Rect? = null

    companion object {
        private var instance: FoldableObserver? = null

        fun getInstance(activity: Activity): FoldableObserver {
            if (instance == null) {
                instance = FoldableObserver(activity)
            }
            return instance!!
        }

        fun getInstance(): FoldableObserver? {
            return instance
        }

        fun clearInstance() {
            instance = null
        }
    }

    fun onCreate() {
        val activity = activityRef.get() ?: return
        observable = WindowInfoTracker.getOrCreate(activity)
                .windowLayoutInfoObservable(activity)
        this.windowBounds = getWindowSize()
    }

    fun onStart() {
        if (disposable?.isDisposed == true) {
            onCreate()
        }
        disposable = observable.observeOn(AndroidSchedulers.mainThread())
                .subscribe { layoutInfo ->
                    setIsDeviceFolded(layoutInfo)
                    handleWindowLayoutInfo()
                    SplitView.setDeviceFolded()
                }
    }

    fun onStop() {
        disposable?.dispose()
    }

    fun onDestroy() {
        onStop()
        clearInstance()
    }

    private fun setIsDeviceFolded(layoutInfo: WindowLayoutInfo) {
        val foldingFeature = layoutInfo.displayFeatures
                .filterIsInstance<FoldingFeature>()
                .firstOrNull()
        isDeviceFolded = when {
            foldingFeature === null -> isCompactView()
            foldingFeature.state === FoldingFeature.State.FLAT -> false
            isTableTopPosture(foldingFeature) -> false
            isBookPosture(foldingFeature) -> false
            else -> true
        }
    }

    private fun handleWindowLayoutInfo() {
        val bounds = getWindowSize()

        if (bounds?.width() != windowBounds?.width()) {
            // emit the dimensions changed event
            windowBounds = bounds
            SplitView.emitDimensionsChanged()
        }
    }


    private fun getWindowSize(): Rect? {
        val activity = activityRef.get() ?: return null
        val metrics = WindowMetricsCalculator.getOrCreate().computeCurrentWindowMetrics(activity)
        val bounds = metrics.bounds
        val widthPx = bounds.width()
        val heightPx = bounds.height()

        // Get the screen density (scale factor)
        val displayMetrics = activity.resources.displayMetrics
        val density = displayMetrics.density

        // Adjust dimensions based on the scale factor (density)
        val widthDp = (widthPx / density).toInt()
        val heightDp = (heightPx / density).toInt()
        return Rect(0, 0, widthDp, heightDp)
    }

    fun getWindowDimensions(): Rect? {
        return this.windowBounds
    }

    fun isCompactView(): Boolean {
        val activity = activityRef.get() ?: return false
        val bounds = getWindowSize()
        val width = bounds?.width() ?: 0
        val height = bounds?.height() ?: 0
        val density = activity.resources.displayMetrics.density
        val windowSizeClass = WindowSizeClass.compute(width / density, height / density)
        val widthWindowSizeClass = windowSizeClass.windowWidthSizeClass
        val heightWindowSizeClass = windowSizeClass.windowHeightSizeClass

        return widthWindowSizeClass === WindowWidthSizeClass.COMPACT || heightWindowSizeClass === WindowHeightSizeClass.COMPACT
    }

    private fun isTableTopPosture(foldFeature: FoldingFeature?): Boolean {
        return foldFeature?.state == FoldingFeature.State.HALF_OPENED &&
                foldFeature.orientation == FoldingFeature.Orientation.HORIZONTAL
    }

    private fun isBookPosture(foldFeature: FoldingFeature?): Boolean {
        return foldFeature?.state == FoldingFeature.State.HALF_OPENED &&
                foldFeature.orientation == FoldingFeature.Orientation.VERTICAL
    }
}
