package com.mattermost.rnbeta;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentResolver;
import android.content.Context;
import android.content.res.AssetFileDescriptor;
import android.net.Uri;
import android.os.Environment;
import android.util.Log;
import android.util.Patterns;
import android.webkit.MimeTypeMap;
import android.webkit.URLUtil;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.uimanager.events.RCTEventEmitter;
import com.mattermost.share.RealPathUtil;

import java.io.File;
import java.io.FileNotFoundException;
import java.util.regex.Matcher;

public class RNPasteableEditTextOnPasteListener implements RNEditTextOnPasteListener {

    private RNPasteableEditText mEditText;

    RNPasteableEditTextOnPasteListener(RNPasteableEditText editText) {
        mEditText = editText;
    }

    @Override
    public void onPaste() {
        ReactContext reactContext = (ReactContext)mEditText.getContext();

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
        if (uri.equals("content://com.google.android.apps.docs.editors.kix.editors.clipboard")) {
            String htmlText = item.getHtmlText();
            // Find uri from html
            Matcher matcher = Patterns.WEB_URL.matcher(htmlText);
            if (matcher.find()) {
                uri = htmlText.substring(matcher.start(1), matcher.end());
            }
        }

        if (uri.startsWith("http")) {
            Thread pastImageFromUrlThread = new Thread(new RNPasteableImageFromUrl(reactContext, mEditText, uri));
            pastImageFromUrlThread.start();
            return;
        }

        uri = "file://" + uri;

        // Get type
        String extension = MimeTypeMap.getFileExtensionFromUrl(uri);
        if (extension == null) {
            return;
        }

        String mimeType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension);
        if (mimeType == null) {
            return;
        }

        // Get fileSize
        long fileSize = 0;
        try {
            ContentResolver contentResolver = reactContext.getContentResolver();
            AssetFileDescriptor assetFileDescriptor = contentResolver.openAssetFileDescriptor(Uri.parse(uri), "r");
            fileSize = assetFileDescriptor.getLength();
        } catch (FileNotFoundException e) {
            e.printStackTrace();
        }

        // Get fileName
        String fileName = URLUtil.guessFileName(uri, null, mimeType);

        WritableMap event = Arguments.createMap();
        event.putString("type", mimeType);
        event.putDouble("fileSize", fileSize);
        event.putString("fileName", fileName);
        event.putString("uri", uri);
        reactContext
                .getJSModule(RCTEventEmitter.class)
                .receiveEvent(
                        mEditText.getId(),
                        "onPaste",
                        event
                );
    }
}
