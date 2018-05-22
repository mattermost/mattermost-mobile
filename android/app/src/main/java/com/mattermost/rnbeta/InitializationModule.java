package com.mattermost.rnbeta;

import android.app.Application;
import android.support.annotation.Nullable;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeMap;
import com.mattermost.rnbeta.react_native_interface.AsyncStorageHelper;
import com.mattermost.rnbeta.react_native_interface.KeysReadableArray;
import com.mattermost.rnbeta.react_native_interface.ResolvePromise;
import com.oblador.keychain.KeychainModule;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

public class InitializationModule extends ReactContextBaseJavaModule {

    static final String TOOLBAR_BACKGROUND = "TOOLBAR_BACKGROUND";
    static final String TOOLBAR_TEXT_COLOR = "TOOLBAR_TEXT_COLOR";
    static final String APP_BACKGROUND = "APP_BACKGROUND";

    private final Application mApplication;

    public InitializationModule(Application application, ReactApplicationContext reactContext) {
        super(reactContext);
        mApplication = application;
    }

    @Override
    public String getName() {
        return "Initialization";
    }

    @Nullable
    @Override
    public Map<String, Object> getConstants() {
        Map<String, Object> constants = new HashMap<>();

        /**
         * Package all native module variables in constants
         * in order to avoid the native bridge
         *
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
         *
         * Miscellaneous:
         * MattermostManaged.Config
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

        AsyncStorageHelper asyncStorage = new AsyncStorageHelper(this.getReactApplicationContext());
        HashMap<String, String> asyncStorageResults = asyncStorage.multiGet(asyncStorageKeys);

        String toolbarBackground = asyncStorageResults.get(TOOLBAR_BACKGROUND);
        String toolbarTextColor = asyncStorageResults.get(TOOLBAR_TEXT_COLOR);
        String appBackground = asyncStorageResults.get(APP_BACKGROUND);

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


        if (credentialsExist[0]) {
            constants.put("credentialsExist", true);
            constants.put("credentials", credentials[0]);
        } else {
            constants.put("credentialsExist", false);
        }

        constants.put("managedConfig", config[0]);
        constants.put("replyFromPushNotification", app.replyFromPushNotification);
        app.replyFromPushNotification = false;

        return constants;
    }
}
