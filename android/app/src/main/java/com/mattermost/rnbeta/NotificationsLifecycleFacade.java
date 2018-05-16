package com.mattermost.rnbeta;

import android.app.Activity;
import android.content.pm.ActivityInfo;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.RestrictionsManager;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;
import android.util.Log;
import android.util.ArraySet;
import android.view.WindowManager.LayoutParams;
import android.content.res.Configuration;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import com.reactnativenavigation.NavigationApplication;
import com.reactnativenavigation.controllers.ActivityCallbacks;
import com.reactnativenavigation.react.ReactGateway;
import com.wix.reactnativenotifications.core.AppLifecycleFacade;

import java.util.Set;
import java.util.concurrent.CopyOnWriteArraySet;


public class NotificationsLifecycleFacade extends ActivityCallbacks implements AppLifecycleFacade {
    private static final String TAG = NotificationsLifecycleFacade.class.getSimpleName();
    private static NotificationsLifecycleFacade instance;

    private Bundle managedConfig = null;
    private Activity mVisibleActivity;
    private Set<AppVisibilityListener> mListeners = new CopyOnWriteArraySet<>();

    private final IntentFilter restrictionsFilter =
            new IntentFilter(Intent.ACTION_APPLICATION_RESTRICTIONS_CHANGED);

    private final BroadcastReceiver restrictionsReceiver = new BroadcastReceiver() {
        @Override public void onReceive(Context context, Intent intent) {
            if (context != null) {
                // Get the current configuration bundle
                RestrictionsManager myRestrictionsMgr =
                        (RestrictionsManager) context
                                .getSystemService(Context.RESTRICTIONS_SERVICE);
                managedConfig = myRestrictionsMgr.getApplicationRestrictions();

                // Check current configuration settings, change your app's UI and
                // functionality as necessary.
                Log.i("ReactNative", "Managed Configuration Changed");
                sendConfigChanged(managedConfig);
            }
        }
    };

    public static NotificationsLifecycleFacade getInstance() {
        if (instance == null) {
            instance = new NotificationsLifecycleFacade();
        }

        return instance;
    }

    @Override
    public void onActivityCreated(Activity activity, Bundle savedInstanceState) {
        MattermostManagedModule managedModule = MattermostManagedModule.getInstance();
        if (managedModule != null && managedModule.isBlurAppScreenEnabled() && activity != null) {
            activity.getWindow().setFlags(LayoutParams.FLAG_SECURE,
                    LayoutParams.FLAG_SECURE);
        }
        if (managedConfig!= null && managedConfig.size() > 0 && activity != null) {
            activity.registerReceiver(restrictionsReceiver, restrictionsFilter);
        }
    }

    @Override
    public void onActivityResumed(Activity activity) {
        switchToVisible(activity);

        ReactContext ctx = getRunningReactContext();
        if (managedConfig != null && managedConfig.size() > 0 && ctx != null) {

            RestrictionsManager myRestrictionsMgr =
                    (RestrictionsManager) ctx
                            .getSystemService(Context.RESTRICTIONS_SERVICE);

            Bundle newConfig = myRestrictionsMgr.getApplicationRestrictions();
            if (!equalBundles(newConfig ,managedConfig)) {
                Log.i("ReactNative", "onResumed Managed Configuration Changed");
                managedConfig = newConfig;
                sendConfigChanged(managedConfig);
            }
        }
    }

    @Override
    public void onActivityPaused(Activity activity) {
        switchToInvisible(activity);
    }

    @Override
    public void onActivityStopped(Activity activity) {
        switchToInvisible(activity);
        if (managedConfig != null && managedConfig.size() > 0) {
            try {
                activity.unregisterReceiver(restrictionsReceiver);
            } catch (IllegalArgumentException e) {
                // Just ignore this cause the receiver wasn't registered for this activity
            }
        }
    }

    @Override
    public void onActivityDestroyed(Activity activity) {
        switchToInvisible(activity);
    }

    @Override
    public boolean isReactInitialized() {
        return NavigationApplication.instance.isReactContextInitialized();
    }

    @Override
    public ReactContext getRunningReactContext() {
        final ReactGateway reactGateway = NavigationApplication.instance.getReactGateway();
        if (reactGateway == null || !reactGateway.isInitialized()) {
            return null;
        }

        return reactGateway.getReactContext();
    }

    @Override
    public boolean isAppVisible() {
        return mVisibleActivity != null;
    }

    @Override
    public synchronized void addVisibilityListener(AppVisibilityListener listener) {
        mListeners.add(listener);
    }

    @Override
    public synchronized void removeVisibilityListener(AppVisibilityListener listener) {
        mListeners.remove(listener);
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        if (mVisibleActivity != null) {
            Intent intent = new Intent("onConfigurationChanged");
            intent.putExtra("newConfig", newConfig);
            mVisibleActivity.sendBroadcast(intent);
        }
    }

    private synchronized void switchToVisible(Activity activity) {
        if (mVisibleActivity == null) {
            mVisibleActivity = activity;
            Log.v(TAG, "Activity is now visible ("+activity+")");
            for (AppVisibilityListener listener : mListeners) {
                listener.onAppVisible();
            }
        }
    }

    private synchronized void switchToInvisible(Activity activity) {
        if (mVisibleActivity == activity) {
            mVisibleActivity = null;
            Log.v(TAG, "Activity is now NOT visible ("+activity+")");
            for (AppVisibilityListener listener : mListeners) {
                listener.onAppNotVisible();
            }
        }
    }

    public synchronized void LoadManagedConfig(ReactContext ctx) {
        if (ctx != null) {
            RestrictionsManager myRestrictionsMgr =
                    (RestrictionsManager) ctx
                            .getSystemService(Context.RESTRICTIONS_SERVICE);

            managedConfig = myRestrictionsMgr.getApplicationRestrictions();
            myRestrictionsMgr = null;
        }
    }

    public synchronized Bundle getManagedConfig() {
        if (managedConfig!= null && managedConfig.size() > 0) {
            return managedConfig;
        }

        ReactContext ctx = getRunningReactContext();

        if (ctx != null) {
            LoadManagedConfig(ctx);
            return managedConfig;
        }

        return null;
    }

    public void sendConfigChanged(Bundle config) {
        Object result = Arguments.fromBundle(config);
        ReactContext ctx = getRunningReactContext();
        if (ctx != null) {
            ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).
                    emit("managedConfigDidChange", result);
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
