package com.mattermost.rnbeta

import android.os.Bundle
import android.text.InputType
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputConnection
import androidx.core.os.BuildCompat
import androidx.core.view.inputmethod.EditorInfoCompat
import androidx.core.view.inputmethod.InputConnectionCompat
import androidx.core.view.inputmethod.InputContentInfoCompat
import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.views.textinput.ReactEditText
import com.facebook.react.views.textinput.ReactTextInputManager

class RNPasteableTextInputManager : ReactTextInputManager() {
    override fun getName(): String {
        return "PasteableTextInputAndroid"
    }

    override fun createViewInstance(context: ThemedReactContext): ReactEditText {
        val editText: RNPasteableEditText = object : RNPasteableEditText(context) {
            override fun onCreateInputConnection(editorInfo: EditorInfo): InputConnection {
                val ic = super.onCreateInputConnection(editorInfo)
                EditorInfoCompat.setContentMimeTypes(editorInfo, arrayOf("image/*"))
                val callback = InputConnectionCompat.OnCommitContentListener { inputContentInfo: InputContentInfoCompat, flags: Int, _: Bundle? ->
                    // read and display inputContentInfo asynchronously
                    var result = true
                    if (BuildCompat.isAtLeastNMR1() && flags and
                            InputConnectionCompat.INPUT_CONTENT_GRANT_READ_URI_PERMISSION != 0) {
                        try {
                            inputContentInfo.requestPermission()
                        } catch (e: Exception) {
                            result = false
                        }
                    }
                    if (result) {
                        onPasteListener!!.onPaste(inputContentInfo.contentUri)
                    }
                    result
                }
                return InputConnectionCompat.createWrapper(ic, editorInfo, callback)
            }
        }
        val inputType = editText.inputType
        editText.inputType = inputType and InputType.TYPE_TEXT_FLAG_MULTI_LINE.inv()
        editText.returnKeyType = "done"
        editText.customInsertionActionModeCallback = RNPasteableActionCallback(editText)
        editText.customSelectionActionModeCallback = RNPasteableActionCallback(editText)
        return editText
    }

    override fun addEventEmitters(reactContext: ThemedReactContext, editText: ReactEditText) {
        super.addEventEmitters(reactContext, editText)
        val pasteableEditText = editText as RNPasteableEditText
        pasteableEditText.onPasteListener = RNPasteableEditTextOnPasteListener(pasteableEditText)
    }

    override fun getExportedCustomBubblingEventTypeConstants(): Map<String, Any>? {
        val map = super.getExportedCustomBubblingEventTypeConstants()
        map!!["onPaste"] = MapBuilder.of(
                "phasedRegistrationNames",
                MapBuilder.of("bubbled", "onPaste"))
        return map
    }
}
