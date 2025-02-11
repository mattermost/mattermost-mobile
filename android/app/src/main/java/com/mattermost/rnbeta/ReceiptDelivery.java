package com.mattermost.rnbeta;

import android.os.Bundle;

import java.lang.System;
import java.util.Objects;

import org.json.JSONObject;

import com.facebook.react.bridge.Arguments;

import com.facebook.react.bridge.WritableMap;
import com.mattermost.helpers.*;
import com.mattermost.turbolog.TurboLog;

import okhttp3.Response;

public class ReceiptDelivery {
    private static final String[] ackKeys = new String[]{"post_id", "root_id", "category", "message", "team_id", "channel_id", "channel_name", "type", "sender_id", "sender_name", "version"};

    public static Bundle send(final String ackId, final String serverUrl, final String postId, final String type, final boolean isIdLoaded) {
        TurboLog.Companion.i("ReactNative", String.format("Send receipt delivery ACK=%s TYPE=%s to URL=%s with ID-LOADED=%s", ackId, type, serverUrl, isIdLoaded));
        WritableMap options = Arguments.createMap();
        WritableMap headers = Arguments.createMap();
        WritableMap body = Arguments.createMap();
        headers.putString("Content-Type", "application/json");
        options.putMap("headers", headers);
        body.putString("id", ackId);
        body.putDouble("received_at", System.currentTimeMillis());
        body.putString("platform", "android");
        body.putString("type", type);
        body.putString("post_id", postId);
        body.putBoolean("is_id_loaded", isIdLoaded);
        options.putMap("body", body);

        try (Response response = Network.postSync(serverUrl, "api/v4/notifications/ack", options)) {
            String responseBody = Objects.requireNonNull(response.body()).string();
            JSONObject jsonResponse = new JSONObject(responseBody);
            return parseAckResponse(jsonResponse);
        } catch (Exception e) {
            TurboLog.Companion.e("ReactNative", "Send receipt delivery failed " + e.getMessage());
            e.printStackTrace();
            return null;
        }
    }

    public static Bundle parseAckResponse(JSONObject jsonResponse) {
        try {
            Bundle bundle = new Bundle();
            for (String key : ackKeys) {
                if (jsonResponse.has(key)) {
                    bundle.putString(key, jsonResponse.getString(key));
                }
            }
            return bundle;
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }
}
