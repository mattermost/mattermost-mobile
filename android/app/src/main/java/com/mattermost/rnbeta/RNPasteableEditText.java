package com.mattermost.rnbeta;

import android.content.Context;

import com.facebook.react.views.textinput.ReactEditText;

public class RNPasteableEditText extends ReactEditText {

    private RNEditTextOnPasteListener mOnPasteListener;

    public RNPasteableEditText(Context context) {
        super(context);
    }

    @Override
    public boolean onTextContextMenuItem(int id) {
        if (id == android.R.id.paste && mOnPasteListener != null) {
            mOnPasteListener.onPaste();
        }

        return super.onTextContextMenuItem(id);
    }

    public void setOnPasteListener(RNEditTextOnPasteListener listener) {
        mOnPasteListener = listener;
    }
}
