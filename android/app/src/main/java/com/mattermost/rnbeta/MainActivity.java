package com.mattermost.rnbeta;

import android.content.Context;
import android.os.Bundle;
import androidx.annotation.Nullable;

import android.view.Display;
import android.view.KeyEvent;
import android.content.res.Configuration;
import android.view.Window;
import android.view.WindowManager;

import com.reactnativenavigation.NavigationActivity;
import com.github.emilioicai.hwkeyboardevent.HWKeyboardEventModule;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.Optional;

public class MainActivity extends NavigationActivity {
    private boolean HWKeyboardConnected = false;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setFrameRate();
        setContentView(R.layout.launch_screen);
        setHWKeyboardConnected();
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
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
    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (HWKeyboardConnected && event.getKeyCode() == KeyEvent.KEYCODE_ENTER && event.getAction() == KeyEvent.ACTION_UP) {
            String keyPressed = event.isShiftPressed() ? "shift-enter" : "enter";
            HWKeyboardEventModule.getInstance().keyPressed(keyPressed);
            return true;
        }
        return super.dispatchKeyEvent(event);
    };

    private void setHWKeyboardConnected() {
        HWKeyboardConnected = getResources().getConfiguration().keyboard == Configuration.KEYBOARD_QWERTY;
    }

    protected void setFrameRate() {
        ArrayList<HashMap<String, Object>> supported = getSupportedModes();
        boolean seen = false;
        HashMap<String, Object> best = null;
        for (HashMap<String, Object> stringObjectHashMap : supported) {
            if (!seen || (Float)stringObjectHashMap.getOrDefault("refreshRate", 0f) > (Float)best.getOrDefault("refreshRate", 0f)) {
                seen = true;
                best = stringObjectHashMap;
            }
        }

        if (best != null && best.get("id") != null) {
            final Window window = this.getWindow();
            final WindowManager.LayoutParams params = window.getAttributes();
            params.preferredDisplayModeId =(int)best.get("id");
            window.setAttributes(params);
        }
    }

    protected ArrayList<HashMap<String, Object>> getSupportedModes() {
        final ArrayList<HashMap<String, Object>> ret = new ArrayList<>();
        final WindowManager windowManager = (WindowManager) this.getSystemService(Context.WINDOW_SERVICE);
        final Display display = windowManager.getDefaultDisplay();
        final Display.Mode[] modes = display.getSupportedModes();
        if (modes == null) {
            return ret;
        }

        final Window window = this.getWindow();
        final WindowManager.LayoutParams params = window.getAttributes();
        final int selectedMode = params.preferredDisplayModeId;

        for (final Display.Mode mode : modes) {
            final HashMap<String, Object> item = new HashMap<>();
            item.put("id", mode.getModeId());
            item.put("width", mode.getPhysicalWidth());
            item.put("height", mode.getPhysicalHeight());
            item.put("refreshRate", mode.getRefreshRate());
            item.put("selected", mode.getModeId() == selectedMode);
            ret.add(item);
        }
        return ret;
    }
}
