package com.mattermost.rnbeta;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.net.Uri;
import android.text.InputType;
import android.util.Patterns;
import android.webkit.MimeTypeMap;
import android.webkit.URLUtil;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.common.MapBuilder;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.events.RCTEventEmitter;
import com.facebook.react.views.textinput.ReactEditText;
import com.facebook.react.views.textinput.ReactTextInputManager;

import java.util.Map;
import java.util.regex.Matcher;

import javax.annotation.Nullable;

public class RNPasteableTextInputManager extends ReactTextInputManager {

    @Override
    public String getName() {
        return "PasteableTextInputAndroid";
    }

    @Override
    public ReactEditText createViewInstance(ThemedReactContext context) {
        RNPasteableEditText editText = new RNPasteableEditText(context);
        int inputType = editText.getInputType();
        editText.setInputType(inputType & (~InputType.TYPE_TEXT_FLAG_MULTI_LINE));
        editText.setReturnKeyType("done");
        editText.setCustomInsertionActionModeCallback(new RNPasteableActionCallback(editText));
        editText.setCustomSelectionActionModeCallback(new RNPasteableActionCallback(editText));
        return editText;
    }

    @Override
    protected void addEventEmitters(ThemedReactContext reactContext, ReactEditText editText) {
        super.addEventEmitters(reactContext, editText);

        RNPasteableEditText pasteableEditText = (RNPasteableEditText)editText;
        pasteableEditText.setOnPasteListener(new RNPasteableEditTextOnPasteListener(pasteableEditText));
    }

    @Nullable
    @Override
    public Map<String, Object> getExportedCustomBubblingEventTypeConstants() {
        Map map = super.getExportedViewConstants();
        map.put("onPaste", MapBuilder.of("phasedRegistrationNames", MapBuilder.of("bubbled", "onPaste")));
        return map;
    }
}
