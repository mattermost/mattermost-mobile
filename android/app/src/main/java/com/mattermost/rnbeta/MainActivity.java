package com.mattermost.rnbeta;

import android.os.Bundle;
import androidx.annotation.Nullable;

import com.reactnativenavigation.NavigationActivity;
import android.view.KeyEvent;
import com.github.emilioicai.hwkeyboardevent.HWKeyboardEventModule;

public class MainActivity extends NavigationActivity {
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.launch_screen);
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
