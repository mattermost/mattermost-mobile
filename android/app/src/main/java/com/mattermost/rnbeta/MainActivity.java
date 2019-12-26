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
    public boolean onKeyUp(int keyCode, KeyEvent event) {
        if(keyCode == KeyEvent.KEYCODE_ENTER && event.isShiftPressed()) {
            KeyEventModule.getInstance().onKeyUpEvent(88, event);
            return true;
        }
        if(keyCode == KeyEvent.KEYCODE_ENTER && !event.isShiftPressed()) {
            KeyEventModule.getInstance().onKeyUpEvent(55, event);
            return true;
        }
        return super.onKeyUp(keyCode, event);
    }
}
