package com.mattermost.rnbeta;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.uimanager.UIManagerModule;
import android.content.Context;
import android.view.View;
import android.view.inputmethod.InputMethodManager;

import androidx.annotation.NonNull;

public class RNTextInputResetModule extends ReactContextBaseJavaModule {
  public RNTextInputResetModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  @NonNull
  public String getName() {
    return "RNTextInputReset";
  }

  // https://github.com/facebook/react-native/pull/12462#issuecomment-298812731
  @ReactMethod
  public void resetKeyboardInput(final int reactTagToReset) {
      UIManagerModule uiManager = getReactApplicationContext().getNativeModule(UIManagerModule.class);
      assert uiManager != null;
      uiManager.addUIBlock(nativeViewHierarchyManager -> {
          InputMethodManager imm = (InputMethodManager) getReactApplicationContext().getBaseContext().getSystemService(Context.INPUT_METHOD_SERVICE);
          if (imm != null) {
              View viewToReset = nativeViewHierarchyManager.resolveView(reactTagToReset);
              imm.restartInput(viewToReset);
          }
      });
  }
}
