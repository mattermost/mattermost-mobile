package com.mattermost.rnbeta

import android.R
import android.content.ClipboardManager
import android.content.Context
import android.net.Uri
import android.os.Bundle
import android.view.ActionMode
import android.view.Menu
import android.view.MenuItem
import com.facebook.react.bridge.Arguments

class RNPasteableActionCallback internal constructor(private val mEditText: RNPasteableEditText) : ActionMode.Callback {
    override fun onCreateActionMode(mode: ActionMode, menu: Menu): Boolean {
        val config: Bundle = com.mattermost.rnbeta.MainApplication.instance.getManagedConfig()
        val result = Arguments.fromBundle(config)
        val copyPasteProtection = result.getString("copyAndPasteProtection")
        if (copyPasteProtection == "true") {
            disableMenus(menu)
        }
        return true
    }

    override fun onPrepareActionMode(mode: ActionMode, menu: Menu): Boolean = false

    override fun onActionItemClicked(mode: ActionMode, item: MenuItem): Boolean {
        val uri = uriInClipboard
        if (item.itemId == R.id.paste && uri != null) {
            mEditText.onPasteListener?.onPaste(uri)
            mode.finish()
        } else {
            mEditText.onTextContextMenuItem(item.itemId)
        }
        return true
    }

    override fun onDestroyActionMode(mode: ActionMode) {}
    private fun disableMenus(menu: Menu) {
        for (i in 0 until menu.size()) {
            val item = menu.getItem(i)
            val id = item.itemId
            val shouldDisableMenu = id == R.id.paste || id == R.id.copy || id == R.id.cut
            item.isEnabled = !shouldDisableMenu
        }
    }

    private val uriInClipboard: Uri?
        get() {
            val clipboardManager = mEditText.context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            val clipData = clipboardManager.primaryClip ?: return null
            val item = clipData.getItemAt(0) ?: return null
            val text = item.text.toString()
            return if (text.length > 0) {
                null
            } else item.uri
        }

}
