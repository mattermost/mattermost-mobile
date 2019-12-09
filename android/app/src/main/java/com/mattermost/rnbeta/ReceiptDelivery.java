package com.mattermost.rnbeta;

import android.content.Context;
import androidx.annotation.Nullable;
import android.os.Bundle;
import android.util.Log;
import java.lang.System;

import okhttp3.Call;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.HttpUrl;

import org.json.JSONObject;
import org.json.JSONException;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

import com.mattermost.react_native_interface.ResolvePromise;

public class ReceiptDelivery {
    static final String CURRENT_SERVER_URL = "@currentServerUrl";

    public static void send(Context context, final String ackId, final String postId, final String type, final boolean isIdLoaded, ResolvePromise promise) {
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

    protected static void execute(String serverUrl, String postId, String token, String ackId, String type, boolean isIdLoaded, ResolvePromise promise) {
        if (token == null) {
            promise.reject("Receipt delivery failure", "Invalid token");
            return;
        }

        if (serverUrl == null) {
            promise.reject("Receipt delivery failure", "Invalid server URL");
        }

        JSONObject json;
        long receivedAt = System.currentTimeMillis();

        try {
            json = new JSONObject();
            json.put("id", ackId);
            json.put("received_at", receivedAt);
            json.put("platform", "android");
            json.put("type", type);
            json.put("post_id", postId);
            json.put("is_id_loaded", isIdLoaded);
        } catch (JSONException e) {
            Log.e("ReactNative", "Receipt delivery failed to build json payload");
            promise.reject("Receipt delivery failure", e.toString());
            return;
        }

        final HttpUrl url = HttpUrl.parse(
            String.format("%s/api/v4/notifications/ack", serverUrl.replaceAll("/$", "")));
        if (url != null) {
            final OkHttpClient client = new OkHttpClient();
            final MediaType JSON = MediaType.parse("application/json; charset=utf-8");
            RequestBody body = RequestBody.create(JSON, json.toString());
            Request request = new Request.Builder()
                    .header("Authorization", String.format("Bearer %s", token))
                    .header("Content-Type", "application/json")
                    .url(url)
                    .post(body)
                    .build();

            try {
                Response response = client.newCall(request).execute();
                String responseBody = response.body().string();
                if (response.code() != 200 || !isIdLoaded) {
                    throw new Exception(responseBody);
                }
                JSONObject jsonResponse = new JSONObject(responseBody);
                Bundle bundle = new Bundle();
                String keys[] = new String[] {"post_id", "category", "message", "team_id", "channel_id", "channel_name", "type", "sender_id", "sender_name", "version"};
                for (int i = 0; i < keys.length; i++) {
                    String key = keys[i];
                    if (jsonResponse.has(key)) {
                        bundle.putString(key, jsonResponse.getString(key));
                    }
                }
                promise.resolve(bundle);
            } catch (Exception e) {
                Log.e("ReactNative", "Receipt delivery failed to send");
                promise.reject("Receipt delivery failure", e.toString());
            }
        }
    }
}
