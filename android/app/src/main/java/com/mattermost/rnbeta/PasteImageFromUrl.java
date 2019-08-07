package com.mattermost.rnbeta;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.uimanager.events.RCTEventEmitter;
import com.facebook.react.views.textinput.ReactEditText;

import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLConnection;

public class PasteImageFromUrl implements Runnable {

    private ReactContext mContext;
    private String mUri;
    private ReactEditText mTarget;

    PasteImageFromUrl(ReactContext context, ReactEditText target, String uri) {
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
                // Get fileSize
                long length = Long.parseLong(u.getHeaderField("Content-Length"));

                // Get type
                String type = u.getHeaderField("Content-Type");

                // Get fileName
                String contentDisposition = u.getHeaderField("Content-Disposition");
                int startIndex = contentDisposition.indexOf("filename=\"") + 10;
                int endIndex = contentDisposition.length() - 1;
                String fileName = contentDisposition.substring(startIndex, endIndex);

                WritableMap event = Arguments.createMap();
                event.putString("type", type);
                event.putDouble("fileSize", length);
                event.putString("fileName", fileName);
                event.putString("uri", mUri);
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
