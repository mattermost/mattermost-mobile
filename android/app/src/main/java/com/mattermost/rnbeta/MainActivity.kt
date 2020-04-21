package com.mattermost.rnbeta;

import android.os.Bundle;
import androidx.annotation.Nullable;
import android.view.KeyEvent;
import android.content.res.Configuration;

import com.reactnativenavigation.NavigationActivity;
import com.github.emilioicai.hwkeyboardevent.HWKeyboardEventModule;

class MainActivity : NavigationActivity() {
    private var HWKeyboardConnected = false;

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.launch_screen);
        HWKeyboardConnected = getResources().getConfiguration().keyboard == Configuration.KEYBOARD_QWERTY;
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig);

        if (newConfig.hardKeyboardHidden == Configuration.HARDKEYBOARDHIDDEN_NO) {
            HWKeyboardConnected = true;
        } else if (newConfig.hardKeyboardHidden == Configuration.HARDKEYBOARDHIDDEN_YES) {
            HWKeyboardConnected = false;
        }
    }

    /*
    https://mattermost.atlassian.net/browse/MM-10601
    Required by react-native-hw-keyboard-event
    (https://github.com/emilioicai/react-native-hw-keyboard-event)
    */
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (HWKeyboardConnected && event.getKeyCode() == KeyEvent.KEYCODE_ENTER && event.getAction() == KeyEvent.ACTION_UP) {
            val keyPressed = if (event.isShiftPressed()) "shift-enter" else "enter";
            HWKeyboardEventModule.getInstance().keyPressed(keyPressed);
            return true;
        }
        return super.dispatchKeyEvent(event);
    };
}
