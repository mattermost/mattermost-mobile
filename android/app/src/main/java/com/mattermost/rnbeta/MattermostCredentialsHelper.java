package com.mattermost.rnbeta;

import android.content.Context;

import java.util.ArrayList;
import java.util.HashMap;

import com.facebook.react.bridge.ReactApplicationContext;

import com.oblador.keychain.KeychainModule;

import com.mattermost.react_native_interface.ResolvePromise;
import com.mattermost.react_native_interface.AsyncStorageHelper;
import com.mattermost.react_native_interface.KeysReadableArray;

public class MattermostCredentialsHelper {
    static final String CURRENT_SERVER_URL = "@currentServerUrl";

    public static void getCredentialsForCurrentServer(ReactApplicationContext context, ResolvePromise promise) {
        final KeychainModule keychainModule = new KeychainModule(context);
        final AsyncStorageHelper asyncStorage = new AsyncStorageHelper(context);
        final ArrayList<String> keys = new ArrayList<String>(1);
        keys.add(CURRENT_SERVER_URL);
        KeysReadableArray asyncStorageKeys = new KeysReadableArray() {
            @Override
            public int size() {
                return keys.size();
            }

            @Override
            public String getString(int index) {
                return keys.get(index);
            }
        };

        HashMap<String, String> asyncStorageResults = asyncStorage.multiGet(asyncStorageKeys);
        String serverUrl = asyncStorageResults.get(CURRENT_SERVER_URL);

        keychainModule.getGenericPasswordForOptions(serverUrl, promise);
    }
}
