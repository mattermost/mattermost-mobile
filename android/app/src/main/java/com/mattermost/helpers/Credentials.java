package com.mattermost.helpers;

import androidx.annotation.Nullable;
import androidx.biometric.BiometricPrompt;
import androidx.fragment.app.FragmentActivity;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableMap;
import com.oblador.keychain.KeychainModule;

import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

public class Credentials {

    public static void getCredentialsForServer(ReactApplicationContext context, String serverUrl, ResolvePromise promise, boolean useBiometrics) {
        final KeychainModule keychainModule = new KeychainModule(context);

        if (useBiometrics) {
            authenticateUserWithBiometrics(context, new BiometricPrompt.AuthenticationCallback() {
                @Override
                public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                    WritableMap options = Arguments.createMap();
                    WritableMap authPrompt = Arguments.createMap();
                    authPrompt.putString("title", "Authenticate to retrieve secret");
                    authPrompt.putString("cancel", "Cancel");
                    options.putMap("authenticationPrompt", authPrompt);
                    options.putString("service", serverUrl);

                    keychainModule.getGenericPasswordForOptions(options, promise);
                }

                @Override
                public void onAuthenticationFailed() {
                    promise.reject("Authentication failed", "Biometric authentication failed.");
                }

                @Override
                public void onAuthenticationError(int errorCode, CharSequence errString) {
                    promise.reject("Authentication error", errString.toString());
                }
            });
        } else {
            WritableMap options = Arguments.createMap();
            WritableMap authPrompt = Arguments.createMap();
            authPrompt.putString("title", "Authenticate to retrieve secret");
            authPrompt.putString("cancel", "Cancel");
            options.putMap("authenticationPrompt", authPrompt);
            options.putString("service", serverUrl);

            keychainModule.getGenericPasswordForOptions(options, promise);
        }
    }

    private static void authenticateUserWithBiometrics(ReactApplicationContext context, BiometricPrompt.AuthenticationCallback callback) {
        Executor executor = Executors.newSingleThreadExecutor();
        BiometricPrompt biometricPrompt = new BiometricPrompt((FragmentActivity) context.getCurrentActivity(), executor, callback);

        BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
            .setTitle("Biometric Authentication")
            .setSubtitle("Authenticate using your biometrics")
            .setDescription("Use your fingerprint to authenticate")
            .setNegativeButtonText("Cancel")
            .build();

        biometricPrompt.authenticate(promptInfo);
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

            @Override
            public void reject(String code, String message) {
                token[0] = null;
            }

            @Override
            public void reject(String code, Throwable throwable) {
                token[0] = null;
            }

            @Override
            public void reject(String code, String message, Throwable throwable) {
                token[0] = null;
            }

            @Override
            public void reject(Throwable throwable) {
                token[0] = null;
            }

            @Override
            public void reject(String code, WritableMap userInfo) {
                token[0] = null;
            }

            @Override
            public void reject(String code, WritableMap userInfo, Throwable throwable) {
                token[0] = null;
            }
        }, false);

        return token[0];
    }
}
