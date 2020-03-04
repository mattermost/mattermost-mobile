package com.mattermost.rnbeta;

import android.content.Context;
import androidx.annotation.Nullable;
import android.os.Bundle;
import android.util.Log;
import java.lang.System;

import com.google.api.client.http.HttpResponse;
import com.google.api.client.json.GenericJson;

import org.json.JSONObject;
import org.json.JSONException;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

import com.mattermost.react_native_interface.ResolvePromise;

public class ReceiptDelivery {
    private final String CURRENT_SERVER_URL = "@currentServerUrl";
    private final HttpClient mHttpClient;

    public ReceiptDelivery() {
        Boolean withExponentialBackoff = true;
        mHttpClient = new HttpClient(withExponentialBackoff);
    }

    public void send(Context context, final String ackId, final String postId, final String type, final boolean isIdLoaded, ResolvePromise promise) {
        final ReactApplicationContext reactApplicationContext = new ReactApplicationContext(context);

        MattermostCredentialsHelper.getCredentialsForCurrentServer(reactApplicationContext, new ResolvePromise() {
            @Override
            public void resolve(@Nullable Object value) {
                if (value instanceof Boolean && !(Boolean)value) {
                    return;
                }

                WritableMap map = (WritableMap) value;
                if (map != null) {
                    String token = map.getString("password");
                    String serverUrl = map.getString("service");
                    if (serverUrl.isEmpty()) {
                        String[] credentials = token.split(",[ ]*");
                        if (credentials.length == 2) {
                            token = credentials[0];
                            serverUrl = credentials[1];
                        }
                    }

                    Log.i("ReactNative", String.format("Send receipt delivery ACK=%s TYPE=%s to URL=%s with ID-LOADED=%s", ackId, type, serverUrl, isIdLoaded));
                    execute(serverUrl, postId, token, ackId, type, isIdLoaded, promise);
                }
            }
        });
    }

    protected void execute(String serverUrl, String postId, String token, String ackId, String type, boolean isIdLoaded, ResolvePromise promise) {
        if (token == null) {
            promise.reject("Receipt delivery failure", "Invalid token");
            return;
        }

        if (serverUrl == null) {
            promise.reject("Receipt delivery failure", "Invalid server URL");
        }

        JSONObject json = new JSONObject();
        try {
            json.put("id", ackId);
            json.put("received_at", System.currentTimeMillis());
            json.put("platform", "android");
            json.put("type", type);
            json.put("post_id", postId);
            json.put("is_id_loaded", isIdLoaded);
        } catch (JSONException e) {
            Log.e("ReactNative", "Receipt delivery failed to build json payload");
            promise.reject("Receipt delivery failure", e.toString());
            return;
        }

        String url = String.format("%s/api/v4/notifications/ack", serverUrl.replaceAll("/$", ""));
        String authorization = String.format("Bearer %s", token);
        try {
            HttpResponse response = mHttpClient.post(url, authorization, json.toString());

            if (response.getStatusCode() != 200) {
                throw new Exception(response.parseAsString());
            }

            if (isIdLoaded) {
                GenericJson jsonResponse = response.parseAs(GenericJson.class);
                Bundle bundle = new Bundle();
                String keys[] = new String[] {"post_id", "category", "message", "team_id", "channel_id", "channel_name", "type", "sender_id", "sender_name", "version"};
                for (int i = 0; i < keys.length; i++) {
                    String key = keys[i];
                    if (jsonResponse.containsKey(key)) {
                        bundle.putString(key, jsonResponse.get(key).toString());
                    }
                }
                promise.resolve(bundle);
            }
        } catch (Exception e) {
            Log.e("ReactNative", "Receipt delivery failed to send");
            promise.reject("Receipt delivery failure", e.toString());
        }
    }
}
