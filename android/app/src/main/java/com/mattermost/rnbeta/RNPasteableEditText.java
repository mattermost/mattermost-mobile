package com.mattermost.rnbeta;

import android.content.Context;

import com.facebook.react.views.textinput.ReactEditText;

public class RNPasteableEditText extends ReactEditText {

    private RNEditTextOnPasteListener mOnPasteListener;

    public RNPasteableEditText(Context context) {
        super(context);
    }

    public void setOnPasteListener(RNEditTextOnPasteListener listener) {
        mOnPasteListener = listener;
    }

    public RNEditTextOnPasteListener getOnPasteListener() {
        return mOnPasteListener;
    }
}
