package com.mattermost.helpers;

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
}
