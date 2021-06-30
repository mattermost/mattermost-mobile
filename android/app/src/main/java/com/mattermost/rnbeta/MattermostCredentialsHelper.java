package com.mattermost.rnbeta;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import java.util.ArrayList;
import java.util.HashMap;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.oblador.keychain.KeychainModule;

import com.mattermost.react_native_interface.ResolvePromise;
import com.mattermost.react_native_interface.AsyncStorageHelper;
import com.mattermost.react_native_interface.KeysReadableArray;

public class MattermostCredentialsHelper {
    static final String CURRENT_SERVER_URL = "@currentServerUrl";
    static KeychainModule keychainModule;

    public static void getCredentialsForCurrentServer(ReactApplicationContext context, ResolvePromise promise) {
        final ArrayList<String> keys = new ArrayList<>(1);
        keys.add(CURRENT_SERVER_URL);

        if (keychainModule == null) {
            keychainModule = new KeychainModule(context);
        }

        AsyncStorageHelper asyncStorage = new AsyncStorageHelper(context);
        KeysReadableArray asyncStorageKeys = new KeysReadableArray() {
            @Override
            public int size() {
                return keys.size();
            }

            @Override
            @NonNull
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

    public static ReadableMap getCredentialsSync(ReactApplicationContext context) {
        final String[] serverUrl = new String[1];
        final String[] token = new String[1];
        MattermostCredentialsHelper.getCredentialsForCurrentServer(context, new ResolvePromise() {
            @Override
            public void resolve(@Nullable Object value) {
                WritableMap map = (WritableMap) value;
                if (map != null) {
                    token[0] = map.getString("password");
                    serverUrl[0] = map.getString("service");
                    assert serverUrl[0] != null;
                    if (serverUrl[0].isEmpty()) {
                        String[] credentials = token[0].split(",[ ]*");
                        if (credentials.length == 2) {
                            token[0] = credentials[0];
                            serverUrl[0] = credentials[1];
                        }
                    }
                }
            }
        });
        final WritableMap result = Arguments.createMap();
        result.putString("serverUrl", serverUrl[0]);
        result.putString("token", token[0]);

        return result;
    }
}
