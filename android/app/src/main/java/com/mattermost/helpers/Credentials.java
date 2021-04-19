package com.mattermost.helpers;

import java.util.ArrayList;
import java.util.HashMap;

import com.facebook.react.bridge.ReactApplicationContext;
import com.oblador.keychain.KeychainModule;


public class Credentials {
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
        final WritableMap options = Arguments.createMap();
        // KeyChain module fails if `authenticationPrompt` is not set
        final WritableMap authPrompt = Arguments.createMap();
        authPrompt.putString("title", "Authenticate to retrieve secret");
        authPrompt.putString("cancel", "Cancel");
        options.putMap("authenticationPrompt", authPrompt);
        options.putString("service", serverUrl);

        keychainModule.getGenericPasswordForOptions(options, promise);
    }
}
