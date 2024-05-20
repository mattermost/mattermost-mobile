package com.mattermost.helpers;

import androidx.annotation.Nullable;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableMap;
import com.oblador.keychain.KeychainModule;
import com.oblador.keychain.exceptions.KeyStoreAccessException;

import java.util.concurrent.Executor;

public class Credentials {

    private static void authenticateUserWithBiometrics(ReactApplicationContext context, BiometricPrompt.AuthenticationCallback callback) {
        Executor executor = ContextCompat.getMainExecutor(context);
        BiometricPrompt biometricPrompt = new BiometricPrompt(
                context.getCurrentActivity(),
                executor,
                callback
        );

        BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
                .setTitle("Authenticate to retrieve secret")
                .setSubtitle("Log in using your biometric credential")
                .setNegativeButtonText("Use account password")
                .build();

        try {
            Cipher cipher = getCipher(); // Your logic to initialize and return the Cipher
            BiometricPrompt.CryptoObject cryptoObject = new BiometricPrompt.CryptoObject(cipher);
            biometricPrompt.authenticate(promptInfo, cryptoObject);
        } catch (Exception e) {
            callback.onAuthenticationError(BiometricPrompt.ERROR_NO_BIOMETRICS, "Failed to initialize Cipher: " + e.getMessage());
        }
    }

    private static Cipher getCipher() throws Exception {
        // Your logic to initialize and return the Cipher
        // For example:
        // KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
        // keyStore.load(null);
        // Key key = keyStore.getKey("your-key-alias", null);
        // Cipher cipher = Cipher.getInstance("AES/CBC/PKCS7Padding");
        // cipher.init(Cipher.ENCRYPT_MODE, key);
        // return cipher;
    }

    public static void getCredentialsForServer(ReactApplicationContext context, String serverUrl, ResolvePromise promise) {
        authenticateUserWithBiometrics(context, new BiometricPrompt.AuthenticationCallback() {
            @Override
            public void onAuthenticationError(int errorCode, CharSequence errString) {
                promise.reject("AUTH_ERROR", errString.toString());
            }

            @Override
            public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                final KeychainModule keychainModule = new KeychainModule(context);

                final WritableMap options = Arguments.createMap();
                options.putString("service", serverUrl);

                try {
                    keychainModule.getGenericPasswordForOptions(options, promise);
                } catch (KeyStoreAccessException e) {
                    promise.reject("KEYSTORE_ERROR", e.getMessage());
                }
            }

            @Override
            public void onAuthenticationFailed() {
                promise.reject("AUTH_FAILED", "Authentication failed");
            }
        });
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
