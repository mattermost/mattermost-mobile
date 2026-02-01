package com.mattermost.helpers

import android.content.Context
import android.util.Log
import com.facebook.react.ReactHost
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.mattermost.networkclient.ApiClientModuleImpl
import com.mattermost.rnbeta.BuildConfig
import com.mattermost.turbolog.TurboLog
import com.oblador.keychain.KeychainModule
import java.lang.reflect.Proxy

/**
 * Helper class for Intune helpers initialization and integration.
 *
 * Handles:
 * - TurboLog logger injection
 * - Credential deletion during selective wipe
 */
class IntuneHelper(
    private val applicationContext: Context,
    private val reactHostProvider: () -> ReactHost
) {
    /**
     * Initialize Intune helpers if enabled.
     *
     * This must be called early in the app lifecycle (onCreate) to ensure
     * Intune helpers are ready before any enrollment attempts.
     */
    fun initializeIfEnabled() {
        if (!BuildConfig.INTUNE_ENABLED) {
            TurboLog.d("Intune", "Intune not enabled (INTUNE_ENABLED=false)")
            return
        }

        try {
            injectTurboLogIntoIntune()
            injectCredentialDeleterIntoIntune()

            TurboLog.i("Intune", "Intune helper initialized")
        } catch (_: ClassNotFoundException) {
            TurboLog.d("Intune", "Intune module not available (expected for OSS builds)")
        } catch (e: Exception) {
            TurboLog.e("Intune", "Failed to initialize Intune helpers: ${e.message}")
        }
    }

    /**
     * Inject TurboLog logger into Intune module.
     *
     * The Intune module uses an IntuneLogger interface that defaults to Android Log.
     * This method injects a TurboLog adapter so all Intune logs go through TurboLog.
     */
    private fun injectTurboLogIntoIntune() {
        try {
            val intuneLoggerClass = Class.forName("com.mattermost.intune.utils.IntuneLogger")
            val turboLogAdapter = Proxy.newProxyInstance(
                intuneLoggerClass.classLoader,
                arrayOf(intuneLoggerClass)
            ) { _, method, args ->
                val tag = "Intune ${args[0] as String}"
                val message = args[1] as String
                val throwable = if (args.size > 2) args[2] as? Throwable else null

                when (method.name) {
                    "d" -> TurboLog.d(tag, message)
                    "i" -> TurboLog.i(tag, message)
                    "w" -> {
                        if (throwable != null) {
                            // TurboLog doesn't support throwable, append stack trace to message
                            TurboLog.w(tag, "$message\n${Log.getStackTraceString(throwable)}")
                        } else {
                            TurboLog.w(tag, message)
                        }
                    }
                    "e" -> {
                        if (throwable != null) {
                            // TurboLog doesn't support throwable, append stack trace to message
                            TurboLog.e(tag, "$message\n${Log.getStackTraceString(throwable)}")
                        } else {
                            TurboLog.e(tag, message)
                        }
                    }
                }
                null
            }

            // Get IntuneLog singleton object
            val intuneLogClass = Class.forName("com.mattermost.intune.utils.IntuneLog")
            val instanceField = intuneLogClass.getField("INSTANCE")
            val intuneLogInstance = instanceField.get(null)

            // Call setLogger on the singleton
            val setLoggerMethod = intuneLogClass.getMethod("setLogger", intuneLoggerClass)
            setLoggerMethod.invoke(intuneLogInstance, turboLogAdapter)

            TurboLog.d("Intune", "TurboLog logger injected into Intune module")
        } catch (e: Exception) {
            TurboLog.w("Intune", "Failed to inject TurboLog logger, using default Android Log: ${e.message}")
        }
    }

    /**
     * Inject credential deleter into Intune module.
     *
     * The Intune module uses an IntuneCredentialDeleter interface that defaults to no-op.
     * This method injects an implementation that deletes session tokens from keychain
     * and invalidates network clients during selective wipe.
     *
     * Uses reflection to access Intune classes (for OSS build compatibility).
     */
    private fun injectCredentialDeleterIntoIntune() {
        try {
            val intuneCredentialDeleterClass = Class.forName("com.mattermost.intune.utils.IntuneCredentialDeleter")
            val credentialDeleterAdapter = Proxy.newProxyInstance(
                intuneCredentialDeleterClass.classLoader,
                arrayOf(intuneCredentialDeleterClass)
            ) { _, method, args ->
                when (method.name) {
                    "deleteCredentials" -> {
                        val serverUrl = args[0] as String
                        deleteCredentialsForServer(serverUrl)
                    }
                }
                null
            }

            // Get IntuneCredentialDeletion singleton object
            val intuneCredentialDeletionClass = Class.forName("com.mattermost.intune.utils.IntuneCredentialDeletion")
            val instanceField = intuneCredentialDeletionClass.getField("INSTANCE")
            val intuneCredentialDeletionInstance = instanceField.get(null)

            // Call setDeleter on the singleton
            val setDeleterMethod = intuneCredentialDeletionClass.getMethod("setDeleter", intuneCredentialDeleterClass)
            setDeleterMethod.invoke(intuneCredentialDeletionInstance, credentialDeleterAdapter)

            TurboLog.d("Intune", "Credential deleter injected into Intune module")
        } catch (e: Exception) {
            TurboLog.w("Intune", "Failed to inject credential deleter: ${e.message}")
        }
    }

    /**
     * Delete session token and invalidate network client for a server.
     *
     * This is called by the Intune module during selective wipe via the injected
     * IntuneCredentialDeleter interface.
     *
     * Performs the same actions as:
     * 1. react-native-keychain's resetInternetCredentials
     * 2. react-native-network-client's invalidateClientFor
     */
    private fun deleteCredentialsForServer(serverUrl: String) {
        // Create no-op promise for sync operations
        val noOpPromise = object : Promise {
            override fun resolve(value: Any?) {
                TurboLog.d("Intune", "Credential deletion succeeded for server: $serverUrl")
            }
            override fun reject(code: String, message: String?) {
                TurboLog.w("Intune", "Failed to delete credentials: $message")
            }
            override fun reject(code: String, throwable: Throwable?) {
                TurboLog.w("Intune", "Failed to delete credentials: ${throwable?.message}")
            }
            override fun reject(code: String, message: String?, throwable: Throwable?) {
                TurboLog.w("Intune", "Failed to delete credentials: $message")
            }
            override fun reject(throwable: Throwable) {
                TurboLog.w("Intune", "Failed to delete credentials: ${throwable.message}")
            }
            override fun reject(throwable: Throwable, userInfo: WritableMap) {
                TurboLog.w("Intune", "Failed to delete credentials: ${throwable.message}")
            }
            override fun reject(code: String, userInfo: WritableMap) {
                TurboLog.w("Intune", "Failed to delete credentials: $code")
            }
            override fun reject(code: String, throwable: Throwable?, userInfo: WritableMap) {
                TurboLog.w("Intune", "Failed to delete credentials: ${throwable?.message}")
            }
            override fun reject(code: String, message: String?, userInfo: WritableMap) {
                TurboLog.w("Intune", "Failed to delete credentials: $message")
            }
            override fun reject(code: String?, message: String?, throwable: Throwable?, userInfo: WritableMap?) {
                TurboLog.w("Intune", "Failed to delete credentials: $message")
            }

            @Deprecated("Deprecated in parent")
            override fun reject(message: String) {
                TurboLog.w("Intune", "Failed to delete credentials: $message")
            }
        }

        try {
            // Get ReactApplicationContext from reactHost
            val reactContext = reactHostProvider().currentReactContext
            if (reactContext == null) {
                TurboLog.w("Intune", "React Native not initialized, cannot delete credentials natively")
                return
            }

            // Cast to ReactApplicationContext (currentReactContext returns ReactContext but is actually ReactApplicationContext)
            val reactAppContext = reactContext as? ReactApplicationContext
            if (reactAppContext == null) {
                TurboLog.w("Intune", "Could not cast to ReactApplicationContext")
                return
            }

            // 1. Delete session token from keychain (react-native-keychain)
            // Use resetInternetCredentialsForOptions with a map containing the server
            val keychainModule = KeychainModule(reactAppContext)
            val options = Arguments.createMap()
            options.putString("server", serverUrl)
            keychainModule.resetInternetCredentialsForOptions(options, noOpPromise)

            // Also delete preauth secret (generic password with server as service)
            keychainModule.resetGenericPasswordForOptions(options, noOpPromise)

            // 2. Invalidate network client (react-native-network-client)
            val apiClientModule = ApiClientModuleImpl(reactAppContext)
            apiClientModule.invalidateClientFor(serverUrl, noOpPromise)

            TurboLog.i("Intune", "Deleted keychain credentials and invalidated network client for server: $serverUrl")
        } catch (e: Exception) {
            TurboLog.e("Intune", "Failed to delete credentials for server: ${e.message}\n${Log.getStackTraceString(e)}")
        }
    }
}
