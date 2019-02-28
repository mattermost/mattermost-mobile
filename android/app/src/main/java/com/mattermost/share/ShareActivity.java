package com.mattermost.share;

import android.os.Bundle;

import com.facebook.react.ReactActivity;
import com.mattermost.rnbeta.MainApplication;

public class ShareActivity extends ReactActivity {
    @Override
    protected String getMainComponentName() {
        return "MattermostShare";
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        MainApplication app = (MainApplication) this.getApplication();
        app.sharedExtensionIsOpened = true;
    }

    @Override
    protected void onResume() {
        super.onResume();
        MainApplication.instance.getActivityCallbacks().onActivityResumed(this);
    }

    @Override
    protected void onPause() {
        super.onPause();
        MainApplication.instance.getActivityCallbacks().onActivityPaused(this);
    }

    @Override
    protected void onStop() {
        super.onStop();
        MainApplication.instance.getActivityCallbacks().onActivityStopped(this);
    }

    @Override
    protected void onDestroy() {
        MainApplication.instance.getActivityCallbacks().onActivityDestroyed(this);
        super.onDestroy();
    }
}
