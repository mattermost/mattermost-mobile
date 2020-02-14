package com.mattermost.rnbeta;

import android.content.Intent;
import android.content.res.Configuration;
import android.os.Bundle;
import androidx.annotation.Nullable;

import com.reactnativenavigation.NavigationActivity;
import org.devio.rn.splashscreen.SplashScreen;

public class MainActivity extends NavigationActivity {
    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        Intent intent = new Intent("onConfigurationChanged");
        intent.putExtra("newConfig", newConfig);
        sendBroadcast(intent);
    }

    private boolean isUIModeNight() {
        return getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK == Configuration.UI_MODE_NIGHT_YES;
    }

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        isUIModeNight() ? setTheme(R.style.DarkTheme) : setTheme(R.style.LightTheme);
        SplashScreen.show(this, true);
    }
}
