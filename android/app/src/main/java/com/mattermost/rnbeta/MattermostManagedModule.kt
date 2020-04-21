package com.mattermost.rnbeta;

import android.app.Activity;
import android.app.Application;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.BroadcastReceiver;
import android.os.Bundle;
import android.provider.Settings;
import android.view.WindowManager.LayoutParams;
import android.util.ArraySet;
import android.util.Log;

import java.util.Set;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class MattermostManagedModule extends ReactContextBaseJavaModule implements LifecycleEventListener {
    private static MattermostManagedModule instance;

    private static final String TAG = MattermostManagedModule.class.getSimpleName();

    private final IntentFilter restrictionsFilter =
            new IntentFilter(Intent.ACTION_APPLICATION_RESTRICTIONS_CHANGED);

    private final BroadcastReceiver restrictionsReceiver = new BroadcastReceiver() {
        @Override public void onReceive(Context ctx, Intent intent) {
            if (ctx != null) {
                Bundle managedConfig = MainApplication.instance.loadManagedConfig(ctx);

                // Check current configuration settings, change your app's UI and
                // functionality as necessary.
                Log.i(TAG, "Managed Configuration Changed");
                sendConfigChanged(managedConfig);
                handleBlurScreen(managedConfig);
            }
        }
    };

    private MattermostManagedModule(ReactApplicationContext reactContext) {
        super(reactContext);
        reactContext.addLifecycleEventListener(this);
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
        Intent intent = new Intent(Settings.ACTION_SECURITY_SETTINGS);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getReactApplicationContext().startActivity(intent);

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

    @Override
    public void onHostResume() {
        Activity activity = getCurrentActivity();
        Bundle managedConfig = MainApplication.instance.getManagedConfig();

        if (activity != null && managedConfig != null) {
            activity.registerReceiver(restrictionsReceiver, restrictionsFilter);
        }

        ReactContext ctx = MainApplication.instance.getRunningReactContext();
        Bundle newManagedConfig = null;
        if (ctx != null) {
            newManagedConfig = MainApplication.instance.loadManagedConfig(ctx);
            if (!equalBundles(newManagedConfig, managedConfig)) {
                Log.i(TAG, "onResumed Managed Configuration Changed");
                sendConfigChanged(newManagedConfig);
            }
        }

        handleBlurScreen(newManagedConfig);
    }

    @Override
    public void onHostPause() {
        Activity activity = getCurrentActivity();
        Bundle managedConfig = MainApplication.instance.getManagedConfig();

        if (activity != null && managedConfig != null) {
            try {
                activity.unregisterReceiver(restrictionsReceiver);
            } catch (IllegalArgumentException e) {
                // Just ignore this cause the receiver wasn't registered for this activity
            }
        }
    }

    @Override
    public void onHostDestroy() {
    }

    private void handleBlurScreen(Bundle config) {
        Activity activity = getCurrentActivity();
        boolean blurAppScreen = false;

        if (config != null) {
            blurAppScreen = Boolean.parseBoolean(config.getString("blurApplicationScreen"));
        }

        if (blurAppScreen) {
            activity.getWindow().setFlags(LayoutParams.FLAG_SECURE, LayoutParams.FLAG_SECURE);
        } else {
            activity.getWindow().clearFlags(LayoutParams.FLAG_SECURE);
        }
    }

    private void sendConfigChanged(Bundle config) {
        WritableMap result = Arguments.createMap();
        if (config != null) {
            result = Arguments.fromBundle(config);
        }
        ReactContext ctx = MainApplication.instance.getRunningReactContext();

        if (ctx != null) {
            ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("managedConfigDidChange", result);
        }
    }

    private boolean equalBundles(Bundle one, Bundle two) {
        if (one == null && two == null) {
            return true;
        }

        if (one == null || two == null)
            return false;

        if(one.size() != two.size())
            return false;

        Set<String> setOne = new ArraySet<String>();
        setOne.addAll(one.keySet());
        setOne.addAll(two.keySet());
        Object valueOne;
        Object valueTwo;

        for(String key : setOne) {
            if (!one.containsKey(key) || !two.containsKey(key))
                return false;

            valueOne = one.get(key);
            valueTwo = two.get(key);
            if(valueOne instanceof Bundle && valueTwo instanceof Bundle &&
                    !equalBundles((Bundle) valueOne, (Bundle) valueTwo)) {
                return false;
            }
            else if(valueOne == null) {
                if(valueTwo != null)
                    return false;
            }
            else if(!valueOne.equals(valueTwo))
                return false;
        }

        return true;
    }
}
