package com.mattermost.rnbeta;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.net.Uri;
import android.view.ActionMode;
import android.view.Menu;
import android.view.MenuItem;

import com.reactnativenavigation.parse.params.Bool;

public class RNPasteableActionCallback implements ActionMode.Callback {

    private RNPasteableEditText mEditText;

    RNPasteableActionCallback(RNPasteableEditText editText) {
        mEditText = editText;
    }

    @Override
    public boolean onCreateActionMode(ActionMode mode, Menu menu) {
        return true;
    }

    @Override
    public boolean onPrepareActionMode(ActionMode mode, Menu menu) {
        return false;
    }

    @Override
    public boolean onActionItemClicked(ActionMode mode, MenuItem item) {
        if (item.getItemId() == android.R.id.paste && this.showCustomHandleOnPaste()) {
            mEditText.getOnPasteListener().onPaste();
            mode.finish();
        } else {
            mEditText.onTextContextMenuItem(item.getItemId());
        }

        return true;
    }

    @Override
    public void onDestroyActionMode(ActionMode mode) {

    }

    private boolean showCustomHandleOnPaste() {
        ClipboardManager clipboardManager = (ClipboardManager) mEditText.getContext().getSystemService(Context.CLIPBOARD_SERVICE);
        ClipData clipData = clipboardManager.getPrimaryClip();

        ClipData.Item item = clipData.getItemAt(0);
        if (item == null) {
            return false;
        }

        Uri itemUri = item.getUri();
        return itemUri != null;
    }
}
