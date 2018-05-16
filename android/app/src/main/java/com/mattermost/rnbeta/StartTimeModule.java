package com.mattermost.rnbeta;

import android.app.Application;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.reactnativenavigation.NavigationApplication;

/**
 * Created by miguelespinoza on 3/22/18.
 */

public class StartTimeModule extends ReactContextBaseJavaModule {

    private final Application mApplication;

    public StartTimeModule(Application application, ReactApplicationContext reactContext) {
        super(reactContext);
        mApplication = application;
    }

    @Override
    public String getName() {
        return "StartTime";
    }

    @ReactMethod
    public void getNativeTimes(Promise promise) {
        NavigationApplication app = (NavigationApplication) mApplication;


        WritableMap map = Arguments.createMap();
        map.putDouble("appStartTime", app.APP_START_TIME);
        map.putDouble("reactInitializedStartTime", app.REACT_INITIALIZED_START_TIME);
        map.putDouble("reactInitializedEndTime", app.REACT_INITIALIZED_END_TIME);
        map.putDouble("jsBundleRunStartTime", app.JS_BUNDLE_RUN_START_TIME);
        map.putDouble("jsBundleRunEndTime", app.JS_BUNDLE_RUN_END_TIME);

        promise.resolve(map);
    }

    @ReactMethod
    public void sinceLaunch(String msg, Promise promise) {
        long sinceLaunchTime = System.currentTimeMillis() - MainApplication.APP_START_TIME;
        Log.e("Mattermost", "StartTimeModule.SinceLaunch {" + msg + "}  = " + sinceLaunchTime);

        WritableMap map = Arguments.createMap();
        map.putDouble("sinceLaunchTime", sinceLaunchTime);

        promise.resolve(map);
    }
}
