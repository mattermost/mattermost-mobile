package com.mattermost.helpers;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableMap;
import com.oblador.keychain.KeychainModule;


public class Credentials {
    public static void getCredentialsForServer(ReactApplicationContext context, String serverUrl, ResolvePromise promise) {
        final KeychainModule keychainModule = new KeychainModule(context);

        final WritableMap options = Arguments.createMap();
        // KeyChain module fails if `authenticationPrompt` is not set
        final WritableMap authPrompt = Arguments.createMap();
        authPrompt.putString("title", "Authenticate to retrieve secret");
        authPrompt.putString("cancel", "Cancel");
        options.putMap("authenticationPrompt", authPrompt);
        options.putString("service", serverUrl);

        keychainModule.getGenericPasswordForOptions(options, promise);
    }

    public static String getCredentialsForServerSync(ReactApplicationContext context, String serverUrl) {
        final String[] token = new String[1];
        Credentials.getCredentialsForServer(context, serverUrl, new ResolvePromise() {
            @Override
            public void resolve(@Nullable Object value) {
                WritableMap map = (WritableMap) value;
                if (map != null) {
                    token[0] = map.getString("password");
                    String service = map.getString("service");
                    assert service != null;
                    if (service.isEmpty()) {
                        String[] credentials = token[0].split(", *");
                        if (credentials.length == 2) {
                            token[0] = credentials[0];
                        }
                    }
                }
            }
        });

        return token[0];
    }
}
