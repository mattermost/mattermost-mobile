package com.mattermost.rnbeta;

import android.os.Bundle;
import androidx.annotation.Nullable;

import com.reactnativenavigation.NavigationActivity;
import android.view.KeyEvent;
import com.github.kevinejohn.keyevent.KeyEventModule;

public class MainActivity extends NavigationActivity {
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.launch_screen);
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getKeyCode() == KeyEvent.KEYCODE_ENTER) {
            if (event.getAction() == KeyEvent.ACTION_DOWN && !event.isShiftPressed()){
                KeyEventModule.getInstance().onKeyUpEvent(999, event);
                return true;
            }
            if (event.getAction() == KeyEvent.ACTION_DOWN && event.isShiftPressed()){
                KeyEventModule.getInstance().onKeyUpEvent(888, event);
                return true;
            }
        }

        KeyEventModule.getInstance().onKeyUpEvent(event.getKeyCode(), event);
        return super.dispatchKeyEvent(event);
    };
}
