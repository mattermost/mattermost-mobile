package com.mattermost.helpers;

import java.util.ArrayList;
import java.util.HashMap;

import com.facebook.react.bridge.ReactApplicationContext;
import com.oblador.keychain.KeychainModule;


public class Credentials {
    static final String CURRENT_SERVER_URL = "@currentServerUrl";

    public static void getCredentialsForCurrentServer(ReactApplicationContext context, ResolvePromise promise) {
        final KeychainModule keychainModule = new KeychainModule(context);
        final AsyncStorage asyncStorage = new AsyncStorage(context);
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
