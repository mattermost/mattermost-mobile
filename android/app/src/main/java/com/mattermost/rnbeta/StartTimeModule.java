package com.mattermost.rnbeta;

import android.app.Application;
import android.os.Debug;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.uimanager.IllegalViewOperationException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

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
    public void sinceLaunch(String msg) {
//        long afterReactInitlaunchTime = System.currentTimeMillis() - ((MainApplication) mApplication).getReactAfterStartTime();
//        Log.e("Mattermost", "StartTimeModule.SinceReactInit {" + msg + "}  = " + afterReactInitlaunchTime);

        long launchTime = System.currentTimeMillis() - MainApplication.APP_START_TIME;
        Log.e("Mattermost", "StartTimeModule.SinceLaunch {" + msg + "}  = " + launchTime);
    }

    @ReactMethod
    public void traceStop() {
        Log.i("Mattermost", "TraceStop");
//        Debug.stopMethodTracing();
    }

    @ReactMethod
    public void initStartTimes(/*Promise promise*/) {

        long launchTime = System.currentTimeMillis() - MainApplication.APP_START_TIME;
        long reactInitElapsedTime =  ((MainApplication) mApplication).getReactInitializeElapshedTime();

        long afterReactInitlaunchTime = System.currentTimeMillis() - ((MainApplication) mApplication).getReactAfterStartTime();
//        ArrayList<Long> times = new ArrayList<>(2);
//        times.add(launchTime);
//        times.add(reactInitElapsedTime);

//        final Map<String, Object> constants = new HashMap<>();
//        constants.put("ReactInitializedElapsed", reactInitElapsedTime);
//        constants.put("AfterReactInitTime", afterReactInitlaunchTime);
//        constants.put("LaunchTime", launchTime);
////        return constants;
//
//        Log.e("Mattermost", "initStartTimes: " + constants.toString());
//
//        return constants;


        Log.e("Mattemost", "launchTime: " + String.valueOf(launchTime));
        Log.e("Mattemost", "reactInitElapsedTime: " + String.valueOf(reactInitElapsedTime));
        Log.e("Mattemost", "afterReactInitlaunchTime: " + String.valueOf(afterReactInitlaunchTime));
        Log.e("Mattemost", "afterJSBundleStart: " + String.valueOf(afterReactInitlaunchTime));

//        WritableMap map = Arguments.createMap();
//
//        map.putDouble("ReactInitializedElapsed", reactInitElapsedTime);
//        map.putDouble("AfterReactInitTime", afterReactInitlaunchTime);
//        map.putDouble("LaunchTime", launchTime);
//
//        promise.resolve(map);
    }

    @Override
    public void initialize() {
        super.initialize();
        Log.d("StartTimeModule", "Native module init");
        long launchTime = System.currentTimeMillis() - MainApplication.APP_START_TIME;
        Log.e("Mattermost", "StartTimeModule.SinceLaunch {StartTimeModule.init}  = " + launchTime);
    }
}
