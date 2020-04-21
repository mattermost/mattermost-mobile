package com.mattermost.rnbeta

import android.content.Context
import com.facebook.react.views.textinput.ReactEditText

open class RNPasteableEditText(context: Context?) : ReactEditText(context) {
    private var mOnPasteListener: RNEditTextOnPasteListener? = null

    var onPasteListener: RNEditTextOnPasteListener?
        get() = mOnPasteListener
        set(listener) {
            mOnPasteListener = listener
        }
}
