package com.mattermost.rnbeta;

import android.app.Application;
import android.content.Context;
import android.os.Bundle;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

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
            Bundle config = NotificationsLifecycleFacade.getInstance().getManagedConfig();

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
}
