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
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class MattermostManagedModule extends ReactContextBaseJavaModule {
    public static MattermostManagedModule instance;

    private boolean shouldBlurAppScreen = false;
    private ReactApplicationContext reactContext;

    private MattermostManagedModule(ReactApplicationContext reactContext) {
        super(reactContext);

        this.reactContext = reactContext;
    }

    public static MattermostManagedModule getInstance(ReactApplicationContext reactContext) {
        if (instance == null) {
            instance = new MattermostManagedModule(reactContext);
        }

        return instance;
    }

    @Override
    public String getName() {
        return "MattermostManaged";
    }

    @ReactMethod
    public void blurAppScreen(boolean enabled) {
        this.shouldBlurAppScreen = enabled;
    }

    public boolean isBlurAppScreenEnabled() {
        return this.shouldBlurAppScreen;
    }

    @ReactMethod
    public void getConfig(final Promise promise) {
        try {
            Bundle config = MainApplication.instance.notificationsLifecycleFacade.getManagedConfig();

            if (config != null) {
                Object result = Arguments.fromBundle(config);
                promise.resolve(result);
            } else {
                throw new Exception("The MDM vendor has not sent any Managed configuration");
            }
        } catch (Exception e) {
            promise.reject("no managed configuration", e);
        }
    }

    public void sendConfigChanged(Bundle config) {
        Object result = Arguments.fromBundle(config);
        this.reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).emit("managedConfigDidChange", result);
    }
}
