package com.mattermost.rnbeta;

import android.app.Application;
import android.support.annotation.Nullable;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeMap;
import com.mattermost.rnbeta.react_native_interface.AsyncStorage;
import com.mattermost.rnbeta.react_native_interface.KeysReadableArray;
import com.mattermost.rnbeta.react_native_interface.ResolvePromise;
import com.oblador.keychain.KeychainModule;
import com.reactnativenavigation.NavigationApplication;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

public class StartTimeModule extends ReactContextBaseJavaModule {

    static final String TOOLBAR_BACKGROUND = "TOOLBAR_BACKGROUND";
    static final String TOOLBAR_TEXT_COLOR = "TOOLBAR_TEXT_COLOR";
    static final String APP_BACKGROUND = "APP_BACKGROUND";
    static final String DEVICE_SECURE_CACHE_KEY = "DEVICE_SECURE_CACHE_KEY";

    private final Application mApplication;

    public StartTimeModule(Application application, ReactApplicationContext reactContext) {
        super(reactContext);
        mApplication = application;
    }

    @Override
    public String getName() {
        return "StartTime";
    }

    @Nullable
    @Override
    public Map<String, Object> getConstants() {
        Map<String, Object> constants = new HashMap<>();

        /**
         * KeyStore:
         * credentialsExist
         * deviceToken
         * currentUserId
         * token
         * url
         *
         * AsyncStorage:
         * toolbarBackground
         * toolbarTextColor
         * appBackground
         * isDeviceSecure
         *
         * Miscellaneous:
         * MattermostManaged.Config
         * appStartTime
         * replyFromPushNotification
         */

        MainApplication app = (MainApplication) mApplication;
        final Boolean[] credentialsExist = {false};
        final WritableMap[] credentials = {null};
        final Object[] config = {null};

        // Get KeyStore credentials
        KeychainModule module = new KeychainModule(this.getReactApplicationContext());
        module.getGenericPasswordForOptions(null, new ResolvePromise() {
            @Override
            public void resolve(@Nullable Object value) {
                if (value instanceof Boolean && !(Boolean)value) {
                    credentialsExist[0] = false;
                    return;
                }

                WritableMap map = (WritableMap) value;
                if (map != null) {
                    credentialsExist[0] = true;
                    credentials[0] = map;
                }
            }
        });

        // Get managedConfig from MattermostManagedModule
        MattermostManagedModule.getInstance().getConfig(new ResolvePromise() {
            @Override
            public void resolve(@Nullable Object value) {
                WritableNativeMap nativeMap = (WritableNativeMap) value;
                config[0] = value;
            }
        });


        // Get AsyncStorage key/values
        final ArrayList<String> keys = new ArrayList<String>(5);
        keys.add(TOOLBAR_BACKGROUND);
        keys.add(TOOLBAR_TEXT_COLOR);
        keys.add(APP_BACKGROUND);
        keys.add(DEVICE_SECURE_CACHE_KEY);
        KeysReadableArray asyncStorageKeys = new KeysReadableArray() {
            @Override
            public int size() {
                return keys.size();
            }

            @Override
            public String getString(int index) {
                return keys.get(index);
            }
        };

        AsyncStorage asyncStorage = new AsyncStorage(this.getReactApplicationContext());
        HashMap<String, String> asyncStorageResults = asyncStorage.multiGet(asyncStorageKeys);

        String toolbarBackground = asyncStorageResults.get(TOOLBAR_BACKGROUND);
        String toolbarTextColor = asyncStorageResults.get(TOOLBAR_TEXT_COLOR);
        String appBackground = asyncStorageResults.get(APP_BACKGROUND);
        String managedConfigResult = asyncStorageResults.get(DEVICE_SECURE_CACHE_KEY);

        if (toolbarBackground != null
                && toolbarTextColor != null
                && appBackground != null) {

            constants.put("themesExist", true);
            constants.put("toolbarBackground", toolbarBackground);
            constants.put("toolbarTextColor", toolbarTextColor);
            constants.put("appBackground", appBackground);
        } else {
            constants.put("themesExist", false);
        }

        if (managedConfigResult != null) {
            constants.put("managedConfigResult", managedConfigResult);
        }


        if (credentialsExist[0]) {
            constants.put("credentialsExist", true);
            constants.put("credentials", credentials[0]);
        } else {
            constants.put("credentialsExist", false);
        }

        constants.put("managedConfig", config[0]);
        constants.put("appStartTime", app.APP_START_TIME);
        constants.put("replyFromPushNotification", app.replyFromPushNotification);

        return constants;
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
