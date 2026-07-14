package com.mattermost.helpers;

import android.content.Context;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.ReadableMap;

import com.mattermost.networkclient.ApiClientModuleImpl;
import com.mattermost.networkclient.enums.RetryTypes;
import com.mattermost.rnutils.session_attributes.SessionAttributesEngine;
import com.mattermost.turbolog.TurboLog;

import okhttp3.HttpUrl;
import okhttp3.Response;


public class Network {
    private static ApiClientModuleImpl clientModule;
    private static Context appContext;
    private static final WritableMap clientOptions = Arguments.createMap();
    private static final Promise emptyPromise = new ResolvePromise();

    public static void init(Context context) {
        if (clientModule == null) {
            appContext = context.getApplicationContext();
            clientModule = new ApiClientModuleImpl(context);
            createClientOptions();
        } else {
            TurboLog.Companion.i("ReactNative", "Network already initialized");
        }
    }

    public static void get(String baseUrl, String endpoint, ReadableMap options, Promise promise) {
        createClientIfNeeded(baseUrl);
        clientModule.get(baseUrl, endpoint, withSessionAttributesHeaders(baseUrl, options), promise);
    }

    public static void post(String baseUrl, String endpoint, ReadableMap options, Promise promise) {
        createClientIfNeeded(baseUrl);
        clientModule.post(baseUrl, endpoint, withSessionAttributesHeaders(baseUrl, options), promise);
    }

    public static Response getSync(String baseUrl, String endpoint, ReadableMap options) {
        createClientIfNeeded(baseUrl);
        return clientModule.getSync(baseUrl, endpoint, withSessionAttributesHeaders(baseUrl, options));
    }

    public static Response postSync(String baseUrl, String endpoint, ReadableMap options) {
        createClientIfNeeded(baseUrl);
        return clientModule.postSync(baseUrl, endpoint, withSessionAttributesHeaders(baseUrl, options));
    }

    private static ReadableMap withSessionAttributesHeaders(String baseUrl, ReadableMap options) {
        if (appContext == null) {
            return options;
        }
        try {
            ReadableMap withHeaders = SessionAttributesEngine.withSessionAttributesHeader(appContext, baseUrl, options);
            return withHeaders != null ? withHeaders : options;
        } catch (Exception e) {
            TurboLog.Companion.e("ReactNative", "Failed to inject session attributes headers: " + e.getMessage());
            return options;
        }
    }

    private static void createClientOptions() {
        WritableMap headers = Arguments.createMap();
        headers.putString("X-Requested-With", "XMLHttpRequest");
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
        if (url != null && !clientModule.hasClientFor(url)) {
            clientModule.createClientFor(baseUrl, clientOptions, emptyPromise);
        }
    }
}
