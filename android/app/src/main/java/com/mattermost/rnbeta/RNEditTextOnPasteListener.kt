package com.mattermost.rnbeta

import android.net.Uri

interface RNEditTextOnPasteListener {
    fun onPaste(itemUri: Uri?)
}
