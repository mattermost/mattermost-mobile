package com.mattermost.rnbeta;

import android.os.Bundle;
import android.support.annotation.Nullable;
import com.facebook.react.common.LifecycleState;
import com.reactnativenavigation.controllers.SplashActivity;
import com.reactnativenavigation.NavigationApplication;
import com.reactnativenavigation.react.ReactGateway;

public class MainActivity extends SplashActivity {
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        /**
         * Reference: https://stackoverflow.com/questions/7944338/resume-last-activity-when-launcher-icon-is-clicked
         * 1. Open app from launcher/appDrawer
         * 2. Go home
         * 3. Send notification and open
         * 4. It creates a new Activity and Destroys the old
         * 5. Causing an unnecessary app restart
         * 6. This solution short-circuits the restart
         */
        if (!isTaskRoot()) {
            finish();
            return;
        }
    }

    @Override
    protected void onResume() {
        ReactGateway reactGateway = NavigationApplication.instance.getReactGateway();
        if (reactGateway.hasStartedCreatingContext() 
            && reactGateway.getReactInstanceManager().getLifecycleState() == LifecycleState.BEFORE_CREATE) {
            System.exit(0);
            return;
        }
        
        super.onResume();
    }

    @Override
    public int getSplashLayout() {
        return R.layout.launch_screen;
    }
}
