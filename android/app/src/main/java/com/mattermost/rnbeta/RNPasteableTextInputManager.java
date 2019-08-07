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

        ((RNPasteableEditText)editText).setOnPasteListener(new RNEditTextOnPasteListener() {
            @Override
            public void onPaste() {
                ClipboardManager clipboardManager = (ClipboardManager) reactContext.getSystemService(Context.CLIPBOARD_SERVICE);
                ClipData clipData = clipboardManager.getPrimaryClip();

                ClipData.Item item = clipData.getItemAt(0);
                if (item == null) {
                    return;
                }

                Uri itemUri = item.getUri();
                if (itemUri == null) {
                    return;
                }

                String uri = itemUri.toString();
                // Special handle for Google docs
                if (itemUri.toString().equals("content://com.google.android.apps.docs.editors.kix.editors.clipboard")) {
                    String htmlText = item.getHtmlText();
                    // Find uri from html
                    Matcher matcher = Patterns.WEB_URL.matcher(htmlText);
                    if (matcher.find()) {
                        uri = htmlText.substring(matcher.start(1), matcher.end());
                    }
                }

                if (uri.startsWith("http")) {
                    Thread pastImageFromUrlThread = new Thread(new RNPasteableImageFromUrl(reactContext, editText, uri));
                    pastImageFromUrlThread.start();
                    return;
                }

                String extension = MimeTypeMap.getFileExtensionFromUrl(uri);
                if (extension == null) {
                    return;
                }

                String mimeType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension);
                if (mimeType == null) {
                    return;
                }

                WritableMap event = Arguments.createMap();
                event.putString("type", mimeType);
                event.putDouble("fileSize", 0);
                event.putString("fileName", URLUtil.guessFileName(uri, null, mimeType));
                event.putString("uri", uri);
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
