package com.reactnativenavigation;

import android.app.Application;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.support.annotation.Nullable;
import android.support.v4.app.ActivityOptionsCompat;

import com.facebook.react.ReactApplication;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.uimanager.UIManagerModule;
import com.reactnativenavigation.bridge.EventEmitter;
import com.reactnativenavigation.controllers.ActivityCallbacks;
import com.reactnativenavigation.react.NavigationReactGateway;
import com.reactnativenavigation.react.ReactGateway;

import java.util.List;

public abstract class NavigationApplication extends Application implements ReactApplication {
    public final static long APP_START_TIME = System.currentTimeMillis();
    public long REACT_INITIALIZED_START_TIME;
    public long REACT_INITIALIZED_END_TIME;
    public long JS_BUNDLE_RUN_START_TIME;
    public long JS_BUNDLE_RUN_END_TIME;

    public static NavigationApplication instance;

    private NavigationReactGateway reactGateway;
    private EventEmitter eventEmitter;
    private Handler handler;
    private ActivityCallbacks activityCallbacks;

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        handler = new Handler(getMainLooper());
        reactGateway = new NavigationReactGateway();
        eventEmitter = new EventEmitter(reactGateway);
        activityCallbacks = new ActivityCallbacks();
    }

    @Override
    public void startActivity(Intent intent) {
        String animationType = intent.getStringExtra("animationType");
        if (animationType != null && animationType.equals("fade")) {
            Bundle bundle = ActivityOptionsCompat.makeCustomAnimation(getApplicationContext(),
                    android.R.anim.fade_in,
                    android.R.anim.fade_out
            ).toBundle();
            super.startActivity(intent, bundle);
        } else {
            super.startActivity(intent);
        }
    }

    public void startReactContextOnceInBackgroundAndExecuteJS() {
        REACT_INITIALIZED_START_TIME = System.currentTimeMillis();
        reactGateway.startReactContextOnceInBackgroundAndExecuteJS();
    }

    public void runOnMainThread(Runnable runnable) {
        handler.post(runnable);
    }

    public void runOnMainThread(Runnable runnable, long delay) {
        handler.postDelayed(runnable, delay);
    }

    public ReactGateway getReactGateway() {
        return reactGateway;
    }

    public ActivityCallbacks getActivityCallbacks() {
        return activityCallbacks;
    }

    protected void setActivityCallbacks(ActivityCallbacks activityLifecycleCallbacks) {
        this.activityCallbacks = activityLifecycleCallbacks;
    }

    public boolean isReactContextInitialized() {
        return reactGateway.isInitialized();
    }

    public void onReactInitialized(ReactContext reactContext) {
        REACT_INITIALIZED_END_TIME = System.currentTimeMillis();
    }

    @Override
    public ReactNativeHost getReactNativeHost() {
        return reactGateway.getReactNativeHost();
    }

    public EventEmitter getEventEmitter() {
        return eventEmitter;
    }

    public UIManagerModule getUiManagerModule() {
        return getReactGateway()
                .getReactInstanceManager()
                .getCurrentReactContext()
                .getNativeModule(UIManagerModule.class);
    }

    /**
     * @see ReactNativeHost#getJSMainModuleName()
     */
    @Nullable
    public String getJSMainModuleName() {
        return null;
    }

    /**
     * @see ReactNativeHost#getJSBundleFile()
     */
    @Nullable
    public String getJSBundleFile() {
        return null;
    }

    /**
     * @see ReactNativeHost#getBundleAssetName()
     */
    @Nullable
    public String getBundleAssetName() {
        return null;
    }

    public abstract boolean isDebug();

    public boolean clearHostOnActivityDestroy() {
        return true;
    }

    @Nullable
    public abstract List<ReactPackage> createAdditionalReactPackages();
}
