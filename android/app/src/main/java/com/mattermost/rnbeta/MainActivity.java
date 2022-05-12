package com.mattermost.rnbeta;

import android.os.Bundle;
import androidx.annotation.Nullable;

import android.view.KeyEvent;
import android.content.res.Configuration;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
// import com.facebook.react.ReactActivityDelegate;
// import com.facebook.react.ReactRootView;
import com.reactnativenavigation.NavigationActivity;
import com.github.emilioicai.hwkeyboardevent.HWKeyboardEventModule;

public class MainActivity extends NavigationActivity {
    private boolean HWKeyboardConnected = false;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
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
        if (HWKeyboardConnected) {
            int keyCode = event.getKeyCode();
            int keyAction = event.getAction();
            if (keyAction == KeyEvent.ACTION_UP) {
                if (keyCode == KeyEvent.KEYCODE_ENTER) {
                    String keyPressed = event.isShiftPressed() ? "shift-enter" : "enter";
                    HWKeyboardEventModule.getInstance().keyPressed(keyPressed);
                    return true;
                } else if (keyCode == KeyEvent.KEYCODE_K && event.isCtrlPressed()) {
                    HWKeyboardEventModule.getInstance().keyPressed("find-channels");
                    return true;
                }
            }
        }
        return super.dispatchKeyEvent(event);
    };

    private void setHWKeyboardConnected() {
        HWKeyboardConnected = getResources().getConfiguration().keyboard == Configuration.KEYBOARD_QWERTY;
    }

    /**
   * Returns the instance of the {@link ReactActivityDelegate}. There the RootView is created and
   * you can specify the rendered you wish to use (Fabric or the older renderer).
   */
    // @Override
    // protected ReactActivityDelegate createReactActivityDelegate() {
    //     return new MainActivityDelegate(this, getMainComponentName());
    // }
    // public static class MainActivityDelegate extends ReactActivityDelegate {
    //     public MainActivityDelegate(ReactActivity activity, String mainComponentName) {
    //     super(activity, mainComponentName);
    //     }
    //     @Override
    //     protected ReactRootView createRootView() {
    //     ReactRootView reactRootView = new ReactRootView(getContext());
    //     // If you opted-in for the New Architecture, we enable the Fabric Renderer.
    //     reactRootView.setIsFabric(BuildConfig.IS_NEW_ARCHITECTURE_ENABLED);
    //     return reactRootView;
    //     }
    // }
}
