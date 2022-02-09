package com.mattermost.rnbeta;

import android.app.Activity;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class MattermostManagedModule extends ReactContextBaseJavaModule {
    private static MattermostManagedModule instance;
    private ReactApplicationContext reactContext;

    private static final String TAG = MattermostManagedModule.class.getSimpleName();

    private MattermostManagedModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    public static MattermostManagedModule getInstance(ReactApplicationContext reactContext) {
        if (instance == null) {
            instance = new MattermostManagedModule(reactContext);
        } else {
            instance.reactContext = reactContext;
        }

        return instance;
    }

    public static MattermostManagedModule getInstance() {
        return instance;
    }

    public void sendEvent(String eventName,
                           @Nullable WritableMap params) {
        this.reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
    }

    @Override
    @NonNull
    public String getName() {
        return "MattermostManaged";
    }

    @ReactMethod
    public void isRunningInSplitView(final Promise promise) {
        WritableMap result = Arguments.createMap();
        Activity current = getCurrentActivity();
        if (current != null) {
            result.putBoolean("isSplitView", current.isInMultiWindowMode());
        } else {
            result.putBoolean("isSplitView", false);
        }

        promise.resolve(result);
    }
}
