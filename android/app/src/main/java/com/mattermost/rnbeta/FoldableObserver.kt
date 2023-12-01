package com.mattermost.rnbeta

import android.app.Activity
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

class FoldableObserver(private val activity: Activity) {
    private var disposable: Disposable? = null
    private lateinit var observable: Observable<WindowLayoutInfo>
    public var isDeviceFolded: Boolean = false

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
    }

    fun onCreate() {
        observable = WindowInfoTracker.getOrCreate(activity)
                .windowLayoutInfoObservable(activity)
    }

    fun onStart() {
        if (disposable?.isDisposed == true) {
            onCreate()
        }
        disposable = observable.observeOn(AndroidSchedulers.mainThread())
                .subscribe { layoutInfo ->
                    val splitViewModule = SplitViewModule.getInstance()
                    setIsDeviceFolded(layoutInfo)
                    splitViewModule?.setDeviceFolded()
                }
    }

    fun onStop() {
        disposable?.dispose()
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

    fun isCompactView(): Boolean {
        val metrics = WindowMetricsCalculator.getOrCreate().computeCurrentWindowMetrics(activity)
        val width = metrics.bounds.width()
        val height = metrics.bounds.height()
        val density = activity.resources.displayMetrics.density
        val windowSizeClass = WindowSizeClass.compute(width/density, height/density)
        val widthWindowSizeClass = windowSizeClass.windowWidthSizeClass
        val heightWindowSizeClass = windowSizeClass.windowHeightSizeClass

        return widthWindowSizeClass === WindowWidthSizeClass.COMPACT || heightWindowSizeClass === WindowHeightSizeClass.COMPACT
    }

    private fun isTableTopPosture(foldFeature : FoldingFeature?) : Boolean {
        return foldFeature?.state == FoldingFeature.State.HALF_OPENED &&
                foldFeature.orientation == FoldingFeature.Orientation.HORIZONTAL
    }

    private fun isBookPosture(foldFeature : FoldingFeature?) : Boolean {
        return foldFeature?.state == FoldingFeature.State.HALF_OPENED &&
                foldFeature.orientation == FoldingFeature.Orientation.VERTICAL
    }
}
