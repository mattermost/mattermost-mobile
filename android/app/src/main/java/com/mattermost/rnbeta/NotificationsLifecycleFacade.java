package com.mattermost.rnbeta;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.RestrictionsManager;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;
import android.util.Log;

import com.facebook.react.bridge.ReactContext;
import com.reactnativenavigation.NavigationApplication;
import com.reactnativenavigation.controllers.ActivityCallbacks;
import com.reactnativenavigation.react.ReactGateway;
import com.wix.reactnativenotifications.core.AppLifecycleFacade;

import java.util.Set;
import 	android.util.ArraySet;
import java.util.concurrent.CopyOnWriteArraySet;
import android.view.WindowManager.LayoutParams;


public class NotificationsLifecycleFacade extends ActivityCallbacks implements AppLifecycleFacade {

    private static final String TAG = NotificationsLifecycleFacade.class.getSimpleName();
    private Bundle managedConfig = null;

    private Activity mVisibleActivity;
    private Set<AppVisibilityListener> mListeners = new CopyOnWriteArraySet<>();

    private final IntentFilter restrictionsFilter =
            new IntentFilter(Intent.ACTION_APPLICATION_RESTRICTIONS_CHANGED);

    private final BroadcastReceiver restrictionsReceiver = new BroadcastReceiver() {
        @Override public void onReceive(Context context, Intent intent) {

            if (mVisibleActivity != null) {
                // Get the current configuration bundle
                RestrictionsManager myRestrictionsMgr =
                    (RestrictionsManager) mVisibleActivity
                            .getSystemService(Context.RESTRICTIONS_SERVICE);
                managedConfig = myRestrictionsMgr.getApplicationRestrictions();

                // Check current configuration settings, change your app's UI and
                // functionality as necessary.
                Log.i("ReactNative", "Managed Configuration Changed");
                MattermostManagedModule.instance.sendConfigChanged(managedConfig);
            }
        }
    };

    @Override
    public void onActivityCreated(Activity activity, Bundle savedInstanceState) {
        if (MattermostManagedModule.instance.isBlurAppScreenEnabled()) {
            activity.getWindow().setFlags(LayoutParams.FLAG_SECURE,
                    LayoutParams.FLAG_SECURE);
        }
        if (managedConfig!= null && managedConfig.size() > 0) {
            activity.registerReceiver(restrictionsReceiver, restrictionsFilter);
        }
    }

    @Override
    public void onActivityResumed(Activity activity) {
        switchToVisible(activity);

        if (managedConfig != null && managedConfig.size() > 0) {
            RestrictionsManager myRestrictionsMgr =
                    (RestrictionsManager) activity
                            .getSystemService(Context.RESTRICTIONS_SERVICE);

            Bundle newConfig = myRestrictionsMgr.getApplicationRestrictions();
            if (!equalBundles(newConfig ,managedConfig)) {
                Log.i("ReactNative", "onResumed Managed Configuration Changed");
                managedConfig = newConfig;
                MattermostManagedModule.instance.sendConfigChanged(managedConfig);
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

    public synchronized void LoadManagedConfig(Activity activity) {
        RestrictionsManager myRestrictionsMgr =
                (RestrictionsManager) activity
                        .getSystemService(Context.RESTRICTIONS_SERVICE);

        managedConfig = myRestrictionsMgr.getApplicationRestrictions();
        myRestrictionsMgr = null;
    }

    public synchronized Bundle getManagedConfig() {
        if (managedConfig!= null && managedConfig.size() > 0) {
            return managedConfig;
        }

        if (mVisibleActivity != null) {
            LoadManagedConfig(mVisibleActivity);
            return managedConfig;
        }

        return null;
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
