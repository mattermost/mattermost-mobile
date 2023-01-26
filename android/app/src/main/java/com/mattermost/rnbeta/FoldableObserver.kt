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

    public fun onCreate() {
        observable = WindowInfoTracker.getOrCreate(activity)
                .windowLayoutInfoObservable(activity)
    }

    public fun onStart() {
        disposable?.dispose()
        disposable = observable.observeOn(AndroidSchedulers.mainThread())
                .subscribe { layoutInfo ->
                    val splitViewModule = SplitViewModule.getInstance()
                    val foldingFeature = layoutInfo.displayFeatures
                            .filterIsInstance<FoldingFeature>()
                            .firstOrNull()
                    when {
                        foldingFeature?.state === FoldingFeature.State.FLAT ->
                            splitViewModule?.setDeviceFolded(false)
                        else -> {
                            splitViewModule?.setDeviceFolded(true)
                        }
                    }
                }
    }

    public fun onStop() {
        disposable?.dispose()
    }
}
