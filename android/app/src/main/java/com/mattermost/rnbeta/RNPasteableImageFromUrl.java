package com.mattermost.rnbeta;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.uimanager.events.RCTEventEmitter;
import com.facebook.react.views.textinput.ReactEditText;

import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLConnection;

public class RNPasteableImageFromUrl implements Runnable {

    private ReactContext mContext;
    private String mUri;
    private ReactEditText mTarget;

    RNPasteableImageFromUrl(ReactContext context, ReactEditText target, String uri) {
        mContext = context;
        mUri = uri;
        mTarget = target;
    }

    @Override
    public void run() {
        try {
            URL url = new URL(mUri);
            try {
                URLConnection u = url.openConnection();

                // Get type
                String mimeType = u.getHeaderField("Content-Type");
                if (!mimeType.startsWith("image")) {
                    return;
                }

                // Get fileSize
                long fileSize = Long.parseLong(u.getHeaderField("Content-Length"));

                // Get fileName
                String contentDisposition = u.getHeaderField("Content-Disposition");
                int startIndex = contentDisposition.indexOf("filename=\"") + 10;
                int endIndex = contentDisposition.length() - 1;
                String fileName = contentDisposition.substring(startIndex, endIndex);

                WritableMap image = Arguments.createMap();
                image.putString("type", mimeType);
                image.putDouble("fileSize", fileSize);
                image.putString("fileName", fileName);
                image.putString("uri", mUri);

                WritableArray images = Arguments.createArray();
                images.pushMap(image);

                WritableMap event = Arguments.createMap();
                event.putArray("data", images);

                mContext
                        .getJSModule(RCTEventEmitter.class)
                        .receiveEvent(
                                mTarget.getId(),
                                "onPaste",
                                event
                        );
            } catch (IOException e) {
                e.printStackTrace();
            }
        } catch (MalformedURLException e) {
            e.printStackTrace();
        }
    }
}
