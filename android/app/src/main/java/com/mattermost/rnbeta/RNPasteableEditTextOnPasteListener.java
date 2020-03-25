package com.mattermost.rnbeta;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentResolver;
import android.content.Context;
import android.content.res.AssetFileDescriptor;
import android.net.Uri;
import android.util.Patterns;
import android.webkit.MimeTypeMap;
import android.webkit.URLUtil;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.uimanager.events.RCTEventEmitter;
import com.mattermost.share.RealPathUtil;
import com.mattermost.share.ShareModule;

import java.io.FileNotFoundException;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.regex.Matcher;

public class RNPasteableEditTextOnPasteListener implements RNEditTextOnPasteListener {

    private RNPasteableEditText mEditText;

    RNPasteableEditTextOnPasteListener(RNPasteableEditText editText) {
        mEditText = editText;
    }

    @Override
    public void onPaste(Uri itemUri) {
        ReactContext reactContext = (ReactContext)mEditText.getContext();
        String uri = itemUri.toString();

        WritableArray images = null;
        WritableMap error = null;

        String uriMimeType = reactContext.getContentResolver().getType(itemUri);
        if (uriMimeType == null) {
            return;
        }

        // Special handle for Google docs
        if (uri.equals("content://com.google.android.apps.docs.editors.kix.editors.clipboard")) {
            ClipboardManager clipboardManager = (ClipboardManager) reactContext.getSystemService(Context.CLIPBOARD_SERVICE);
            ClipData clipData = clipboardManager.getPrimaryClip();
            if (clipData == null) {
                return;
            }

            ClipData.Item item = clipData.getItemAt(0);
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

        uri = RealPathUtil.getRealPathFromURI(reactContext, itemUri);
        if (uri == null) {
            return;
        }

        // Get type
        String extension = MimeTypeMap.getFileExtensionFromUrl(uri);
        if (extension == null) {
            return;
        }

        String mimeType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension);
        if (mimeType == null) {
            return;
        }

        // Get fileName
        String fileName = URLUtil.guessFileName(uri, null, mimeType);

        if (uri.contains(ShareModule.CACHE_DIR_NAME)) {
            uri = moveToImagesCache(uri, fileName);
        }

        if (uri == null) {
            return;
        }

        // Get fileSize
        long fileSize;
        try {
            ContentResolver contentResolver = reactContext.getContentResolver();
            AssetFileDescriptor assetFileDescriptor = contentResolver.openAssetFileDescriptor(itemUri, "r");
            if (assetFileDescriptor == null) {
                return;
            }

            fileSize = assetFileDescriptor.getLength();

            WritableMap image = Arguments.createMap();
            image.putString("type", mimeType);
            image.putDouble("fileSize", fileSize);
            image.putString("fileName", fileName);
            image.putString("uri", "file://" + uri);

            images = Arguments.createArray();
            images.pushMap(image);
        } catch (FileNotFoundException e) {
            error = Arguments.createMap();
            error.putString("message", e.getMessage());
        }

        WritableMap event = Arguments.createMap();
        event.putArray("data", images);
        event.putMap("error", error);

        reactContext
                .getJSModule(RCTEventEmitter.class)
                .receiveEvent(
                        mEditText.getId(),
                        "onPaste",
                        event
                );
    }

    private String moveToImagesCache(String src, String fileName) {
        ReactContext ctx = (ReactContext)mEditText.getContext();
        String cacheFolder = ctx.getCacheDir().getAbsolutePath() + "/Images/";
        String dest = cacheFolder + fileName;
        File folder = new File(cacheFolder);


        try {
            if (!folder.exists()) {
                folder.mkdirs();
            }

            Files.move(Paths.get(src), Paths.get(dest));
        } catch (Exception err) {
            return null;
        }

        return dest;
    }
}
