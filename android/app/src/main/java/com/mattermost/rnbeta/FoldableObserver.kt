package com.mattermost.rnbeta

import android.app.Activity
import androidx.window.layout.FoldingFeature
import androidx.window.layout.WindowInfoTracker
import androidx.window.layout.WindowLayoutInfo
import androidx.window.rxjava3.layout.windowLayoutInfoObservable
import io.reactivex.rxjava3.android.schedulers.AndroidSchedulers
import io.reactivex.rxjava3.core.Observable
import io.reactivex.rxjava3.disposables.Disposable

class FoldableObserver(private val activity: Activity) {
    private var disposable: Disposable? = null
    private lateinit var observable: Observable<WindowLayoutInfo>

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
                    val foldingFeature = layoutInfo.displayFeatures
                            .filterIsInstance<FoldingFeature>()
                            .firstOrNull()
                    when {
                        foldingFeature?.state === FoldingFeature.State.FLAT ->
                            splitViewModule?.setDeviceFolded(false)
                        isTableTopPosture(foldingFeature) ->
                            splitViewModule?.setDeviceFolded(false)
                        isBookPosture(foldingFeature) ->
                            splitViewModule?.setDeviceFolded(false)
                        else -> {
                            splitViewModule?.setDeviceFolded(true)
                        }
                    }
                }
    }

    fun onStop() {
        disposable?.dispose()
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
