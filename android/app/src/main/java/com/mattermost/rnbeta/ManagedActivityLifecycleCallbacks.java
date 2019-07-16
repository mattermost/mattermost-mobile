package com.mattermost.rnbeta;

import android.os.Bundle;
import android.app.Activity;
import android.app.Application.ActivityLifecycleCallbacks;
import android.content.Context;
import android.content.RestrictionsManager;
import android.content.BroadcastReceiver;
import android.content.Intent;
import android.content.IntentFilter;
import android.view.WindowManager;
import android.view.WindowManager.LayoutParams;
import android.util.ArraySet;
import android.util.Log;

import java.util.Set;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class ManagedActivityLifecycleCallbacks implements ActivityLifecycleCallbacks {
    private static final String TAG = ManagedActivityLifecycleCallbacks.class.getSimpleName();

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
            }
        }
    };

    @Override
    public void onActivityCreated(Activity activity, Bundle savedInstanceState) {
        MattermostManagedModule managedModule = MattermostManagedModule.getInstance();
        if (managedModule != null && managedModule.isBlurAppScreenEnabled() && activity != null) {
            activity.getWindow().setFlags(LayoutParams.FLAG_SECURE,
                    LayoutParams.FLAG_SECURE);
        }

        Bundle managedConfig = MainApplication.instance.getManagedConfig();
        if (managedConfig != null && activity != null) {
            activity.registerReceiver(restrictionsReceiver, restrictionsFilter);
        }
    }

    @Override
    public void onActivityResumed(Activity activity) {
        ReactContext ctx = MainApplication.instance.getRunningReactContext();
        Bundle managedConfig = MainApplication.instance.getManagedConfig();

        if (ctx != null) {
            Bundle newConfig = MainApplication.instance.loadManagedConfig(ctx);
            if (!equalBundles(newConfig, managedConfig)) {
                Log.i(TAG, "onResumed Managed Configuration Changed");
                sendConfigChanged(newConfig);
            }
        }
    }

    @Override
    public void onActivityStopped(Activity activity) {
        Bundle managedConfig = MainApplication.instance.getManagedConfig();

        if (managedConfig != null) {
            try {
                activity.unregisterReceiver(restrictionsReceiver);
            } catch (IllegalArgumentException e) {
                // Just ignore this cause the receiver wasn't registered for this activity
            }
        }
    }

    @Override
    public void onActivityStarted(Activity activity) {
    }

    @Override
    public void onActivityPaused(Activity activity) {
    }

    @Override
    public void onActivitySaveInstanceState(Activity activity, Bundle outState) {
    }

    @Override
    public void onActivityDestroyed(Activity activity) {
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