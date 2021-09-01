package com.mattermost.helpers;

import android.content.Context;
import android.util.Log;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.ReadableMap;

import com.mattermost.networkclient.APIClientModule;
import com.mattermost.networkclient.enums.RetryTypes;

import okhttp3.HttpUrl;


public class Network {
    private static APIClientModule clientModule;
    private static final WritableMap clientOptions = Arguments.createMap();
    private static final Promise emptyPromise = new ResolvePromise();

    public static void init(Context context) {
        final ReactApplicationContext reactContext = new ReactApplicationContext(context);
        clientModule = new APIClientModule(reactContext);

        createClientOptions();

        // TODO: This is for testing purposes. Remove.
        fetchAndStoreTeamData("gmbz93nzk7drpnsxo8ki93q7ca", "http://192.168.0.14:8065");
    }

    public static void get(String baseUrl, String endpoint, ReadableMap options, Promise promise) {
        createClientIfNeeded(baseUrl);

        clientModule.get(baseUrl, endpoint, options, promise);
    }

    private static void createClientOptions() {
        WritableMap headers = Arguments.createMap();
        headers.putString("X-Requested-With", "XMLHttpRequest");
//        headers.putString("Content-Type", "application/json");
//        headers.putString("Accept", "application/json");
//        headers.putString("User-Agent", System.getProperty("http.agent"));
        clientOptions.putMap("headers", headers);

        WritableMap retryPolicyConfiguration = Arguments.createMap();
        retryPolicyConfiguration.putString("type", RetryTypes.EXPONENTIAL_RETRY.getType());
        retryPolicyConfiguration.putDouble("retryLimit", 2);
        retryPolicyConfiguration.putDouble("exponentialBackoffBase", 2);
        retryPolicyConfiguration.putDouble("exponentialBackoffScale", 0.5);
        clientOptions.putMap("retryPolicyConfiguration", retryPolicyConfiguration);

        WritableMap requestAdapterConfiguration = Arguments.createMap();
        requestAdapterConfiguration.putString("bearerAuthTokenResponseHeader", "token");
        clientOptions.putMap("requestAdapterConfiguration", requestAdapterConfiguration);

        WritableMap sessionConfiguration = Arguments.createMap();
        sessionConfiguration.putInt("httpMaximumConnectionsPerHost", 10);
        sessionConfiguration.putDouble("timeoutIntervalForRequest", 30000);
        sessionConfiguration.putDouble("timeoutIntervalForResource", 30000);
        clientOptions.putMap("sessionConfiguration", sessionConfiguration);
    }

    private static void createClientIfNeeded(String baseUrl) {
        HttpUrl url = HttpUrl.parse(baseUrl);
        if (!clientModule.hasClientFor(url)) {
            Log.d("GEKIDOU", clientOptions.toString());
            clientModule.createClientFor(baseUrl, clientOptions, emptyPromise);
        }
    }

    // TODO: This is for testing purposes. Remove.
    public static void fetchAndStoreTeamData(String teamId, String serverUrl) {
        Log.d("GEKIDOU", "fetchAndStoreTeamData");
        String endpoint = "/teams/" + teamId;
        Network.get(serverUrl, endpoint, null, new ResolvePromise() {
            @Override
            public void resolve(@Nullable Object value) {
                ReadableMap response = (ReadableMap) value;
                Log.d("GEKIDOU", response.toString());
            }

            @Override
            public void reject(String code, String message) {
                Log.e("GEKIDOU", code + ": " + message);
            }
        });
    }
}
