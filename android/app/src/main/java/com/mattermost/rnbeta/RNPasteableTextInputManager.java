package com.mattermost.rnbeta;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentResolver;
import android.content.Context;
import android.net.Uri;
import android.text.InputType;
import android.util.Log;
import android.webkit.MimeTypeMap;
import android.webkit.URLUtil;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.common.MapBuilder;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.events.RCTEventEmitter;
import com.facebook.react.views.textinput.ReactEditText;
import com.facebook.react.views.textinput.ReactTextInputManager;

import java.io.File;
import java.io.IOException;
import java.net.URL;
import java.net.URLConnection;
import java.util.Map;

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
        return editText;
    }

    @Override
    protected void addEventEmitters(ThemedReactContext reactContext, ReactEditText editText) {
        super.addEventEmitters(reactContext, editText);

        ((RNPasteableEditText)editText).setOnPasteListener(new RNEditTextOnPasteListener() {
            @Override
            public void onPaste() {
                ClipboardManager clipboardManager = (ClipboardManager) reactContext.getSystemService(Context.CLIPBOARD_SERVICE);
                ClipData clipData = clipboardManager.getPrimaryClip();

                ClipData.Item item = clipData.getItemAt(0);
                if (item == null) {
                    return;
                }

                String text = item.getText().toString();
                if (!text.startsWith("http")) {
                    return;
                }

                String extension = MimeTypeMap.getFileExtensionFromUrl(text);
                if (extension == null) {
                    return;
                }

                String mimeType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension);
                if (mimeType == null) {
                    return;
                }

                WritableMap event = Arguments.createMap();
                event.putString("type", mimeType);
                event.putString("fileName", URLUtil.guessFileName(text, null, mimeType));
                event.putString("uri", text);
                reactContext
                        .getJSModule(RCTEventEmitter.class)
                        .receiveEvent(
                                editText.getId(),
                                "onPaste",
                                event
                        );
            }
        });
    }

    @Nullable
    @Override
    public Map<String, Object> getExportedCustomBubblingEventTypeConstants() {
        Map map = super.getExportedViewConstants();
        map.put("onPaste", MapBuilder.of("phasedRegistrationNames", MapBuilder.of("bubbled", "onPaste")));
        return map;
    }
}
