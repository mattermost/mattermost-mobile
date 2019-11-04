package com.mattermost.rnbeta;

import androidx.core.view.inputmethod.EditorInfoCompat;
import androidx.core.view.inputmethod.InputConnectionCompat;
import androidx.core.os.BuildCompat;
import android.text.InputType;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputConnection;

import com.facebook.react.common.MapBuilder;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.views.textinput.ReactEditText;
import com.facebook.react.views.textinput.ReactTextInputManager;

import java.util.Map;

import javax.annotation.Nullable;

public class RNPasteableTextInputManager extends ReactTextInputManager {

    @Override
    public String getName() {
        return "PasteableTextInputAndroid";
    }

    @Override
    public ReactEditText createViewInstance(ThemedReactContext context) {
        RNPasteableEditText editText = new RNPasteableEditText(context) {
            @Override
            public InputConnection onCreateInputConnection(EditorInfo editorInfo) {
                final InputConnection ic = super.onCreateInputConnection(editorInfo);
                EditorInfoCompat.setContentMimeTypes(editorInfo,
                        new String [] {"image/*"});


                final InputConnectionCompat.OnCommitContentListener callback =
                        (inputContentInfo, flags, opts) -> {
                            // read and display inputContentInfo asynchronously
                            if (BuildCompat.isAtLeastNMR1() && (flags &
                                    InputConnectionCompat.INPUT_CONTENT_GRANT_READ_URI_PERMISSION) != 0) {
                                try {
                                    inputContentInfo.requestPermission();
                                }
                                catch (Exception e) {
                                    return false;
                                }
                            }

                            this.getOnPasteListener().onPaste(inputContentInfo.getContentUri());
                            return true;
                        };
                return InputConnectionCompat.createWrapper(ic, editorInfo, callback);
            }
        };
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
