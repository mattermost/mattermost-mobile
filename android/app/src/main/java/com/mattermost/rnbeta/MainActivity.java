package com.mattermost.rnbeta;

import android.os.Bundle;
import android.support.annotation.Nullable;
import com.reactnativenavigation.controllers.SplashActivity;

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
    public int getSplashLayout() {
        return R.layout.launch_screen;
    }
}
