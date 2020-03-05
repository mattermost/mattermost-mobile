package com.mattermost.rnbeta;

import android.content.Intent;
import android.content.res.Configuration;
import android.os.Bundle;
import androidx.annotation.Nullable;
import android.view.KeyEvent;

import com.reactnativenavigation.NavigationActivity;
import org.devio.rn.splashscreen.SplashScreen;
import com.github.emilioicai.hwkeyboardevent.HWKeyboardEventModule;

public class MainActivity extends NavigationActivity {
    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        Intent intent = new Intent("onConfigurationChanged");
        intent.putExtra("newConfig", newConfig);
        sendBroadcast(intent);
    }

    private boolean isUIModeNight() {
        int uiMode = getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
        return uiMode == Configuration.UI_MODE_NIGHT_YES;
    }

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        int theme = isUIModeNight() ? R.style.DarkTheme : R.style.LightTheme;
        setTheme(theme);
        SplashScreen.show(this, true);
    }

    /*
    https://mattermost.atlassian.net/browse/MM-10601
    Required by react-native-hw-keyboard-event
    (https://github.com/emilioicai/react-native-hw-keyboard-event)
    */
    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getKeyCode() == KeyEvent.KEYCODE_ENTER && event.getAction() == KeyEvent.ACTION_UP) {
            String keyPressed = event.isShiftPressed() ? "shift-enter" : "enter";
            HWKeyboardEventModule.getInstance().keyPressed(keyPressed);
            return true;
        }
        return super.dispatchKeyEvent(event);
    };
}
