package com.mattermost;

import android.app.Activity;
import android.util.Log;

import com.facebook.react.bridge.ReactContext;
import com.reactnativenavigation.NavigationApplication;
import com.reactnativenavigation.controllers.ActivityCallbacks;
import com.reactnativenavigation.react.ReactGateway;
import com.wix.reactnativenotifications.core.AppLifecycleFacade;

import java.util.Set;
import java.util.concurrent.CopyOnWriteArraySet;

public class NotificationsLifecycleFacade extends ActivityCallbacks implements AppLifecycleFacade {

    private static final String TAG = NotificationsLifecycleFacade.class.getSimpleName();

    private Activity mVisibleActivity;
    private Set<AppVisibilityListener> mListeners = new CopyOnWriteArraySet<>();

    @Override
    public void onActivityResumed(Activity activity) {
        switchToVisible(activity);
    }

    @Override
    public void onActivityPaused(Activity activity) {
        switchToInvisible(activity);
    }

    @Override
    public void onActivityStopped(Activity activity) {
        switchToInvisible(activity);
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
}
