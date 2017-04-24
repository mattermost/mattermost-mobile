package com.mattermost;

import com.facebook.react.ReactActivity;
import com.github.yamill.orientation.OrientationPackage;
import com.psykar.cookiemanager.CookieManagerPackage;
import com.BV.LinearGradient.LinearGradientPackage;
import com.reactnative.ivpusic.imagepicker.PickerPackage;
import android.content.Intent;
import android.content.res.Configuration;
import android.os.Bundle;
import com.reactnativecomponent.splashscreen.RCTSplashScreen;

public class MainActivity extends ReactActivity {

    /**
     * Returns the name of the main component registered from JavaScript.
     * This is used to schedule rendering of the component.
     */
    @Override
    protected String getMainComponentName() {
        return "Mattermost";
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        RCTSplashScreen.openSplashScreen(this);
        super.onCreate(savedInstanceState);
    }

    @Override
      public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        Intent intent = new Intent("onConfigurationChanged");
        intent.putExtra("newConfig", newConfig);
        this.sendBroadcast(intent);
    }

    /**
     * When the back button is pressed and the app is closed it will
     * be sent to the background instead of exiting fixing the newIntent
     * problem where the splash screen wasn't being removed
     */
    @Override
    public void invokeDefaultOnBackPressed() {
        Intent setIntent = new Intent(Intent.ACTION_MAIN);
        setIntent.addCategory(Intent.CATEGORY_HOME);
        setIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(setIntent);
    }
}
