package com.mattermost.rnbeta;

import android.app.Activity;
import android.app.Application;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;

public class MattermostManagedModule extends ReactContextBaseJavaModule {
    private static MattermostManagedModule instance;

    private boolean shouldBlurAppScreen = false;

    private MattermostManagedModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    public static MattermostManagedModule getInstance(ReactApplicationContext reactContext) {
        if (instance == null) {
            instance = new MattermostManagedModule(reactContext);
        }

        return instance;
    }

    public static MattermostManagedModule getInstance() {
        return instance;
    }

    @Override
    public String getName() {
        return "MattermostManaged";
    }

    @ReactMethod
    public void blurAppScreen(boolean enabled) {
        shouldBlurAppScreen = enabled;
    }

    public boolean isBlurAppScreenEnabled() {
        return shouldBlurAppScreen;
    }

    @ReactMethod
    public void getConfig(final Promise promise) {
        try {
            Bundle config = MainApplication.instance.getManagedConfig();

            if (config != null) {
                Object result = Arguments.fromBundle(config);
                promise.resolve(result);
            } else {
                promise.resolve(Arguments.createMap());
            }
        } catch (Exception e) {
            promise.resolve(Arguments.createMap());
        }
    }

    @ReactMethod
    // Close the current activity and open the security settings.
    public void goToSecuritySettings() {
        getReactApplicationContext().startActivity(new Intent(android.provider.Settings.ACTION_SECURITY_SETTINGS));
        getCurrentActivity().finish();
        System.exit(0);
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

    @ReactMethod
    public void quitApp() {
        getCurrentActivity().finish();
        System.exit(0);
    }
}
