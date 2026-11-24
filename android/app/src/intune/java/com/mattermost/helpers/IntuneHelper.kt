package com.mattermost.helpers

import android.app.Application
import android.util.Log
import com.facebook.react.ReactHost
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import com.mattermost.intune.IntuneInitializer
import com.mattermost.intune.utils.IntuneCredentialDeleter
import com.mattermost.intune.utils.IntuneCredentialDeletion
import com.mattermost.intune.utils.IntuneLog
import com.mattermost.intune.utils.IntuneLogger
import com.mattermost.networkclient.ApiClientModuleImpl
import com.mattermost.rnbeta.BuildConfig
import com.mattermost.turbolog.TurboLog
import com.oblador.keychain.KeychainModule

object IntuneHelper {
    private const val TAG = "Intune"

    // Must match ANDROID_PREAUTH_SERVICE_PREFIX in app/init/credentials.ts
    private const val PREAUTH_SERVICE_PREFIX = "preauth-secret::"

    fun initialize(application: Application, reactHostProvider: () -> ReactHost) {
        IntuneLog.setLogger(TurboLogIntuneLogger)
        IntuneCredentialDeletion.setDeleter(object : IntuneCredentialDeleter {
            override fun deleteCredentials(serverUrl: String) = deleteCredentialsForServer(reactHostProvider, serverUrl)
        })
        IntuneInitializer.initialize(application, BuildConfig.DEBUG)
    }

    /**
     * Mirrors the iOS wipe delegate: removes the session token and pre-auth secret and drops the
     * network client. Without a running React instance this is skipped and JS finishes the wipe
     * on next launch from the pending wipe.
     */
    private fun deleteCredentialsForServer(reactHostProvider: () -> ReactHost, serverUrl: String) {
        val reactContext = reactHostProvider().currentReactContext
        if (reactContext == null) {
            TurboLog.w(TAG, "React Native not running, credentials will be removed by the pending wipe")
            return
        }

        val promise = LoggingPromise(serverUrl)
        reactContext.getNativeModule(KeychainModule::class.java)?.let { keychain ->
            keychain.resetInternetCredentialsForOptions(Arguments.createMap().apply { putString("server", serverUrl) }, promise)
            keychain.resetGenericPasswordForOptions(Arguments.createMap().apply { putString("service", "$PREAUTH_SERVICE_PREFIX$serverUrl") }, promise)
        }
        ApiClientModuleImpl(reactContext).invalidateClientFor(serverUrl, promise)
    }

    private object TurboLogIntuneLogger : IntuneLogger {
        override fun d(tag: String, message: String) = TurboLog.d("Intune $tag", message)
        override fun i(tag: String, message: String) = TurboLog.i("Intune $tag", message)
        override fun w(tag: String, message: String) = TurboLog.w("Intune $tag", message)
        override fun w(tag: String, message: String, throwable: Throwable) =
            TurboLog.w("Intune $tag", "$message\n${Log.getStackTraceString(throwable)}")
        override fun e(tag: String, message: String, throwable: Throwable?) =
            TurboLog.e("Intune $tag", if (throwable != null) "$message\n${Log.getStackTraceString(throwable)}" else message)
    }

    private class LoggingPromise(private val serverUrl: String) : Promise {
        override fun resolve(value: Any?) = Unit
        override fun reject(code: String, message: String?) = log(message)
        override fun reject(code: String, throwable: Throwable?) = log(throwable?.message)
        override fun reject(code: String, message: String?, throwable: Throwable?) = log(message)
        override fun reject(throwable: Throwable) = log(throwable.message)
        override fun reject(throwable: Throwable, userInfo: WritableMap) = log(throwable.message)
        override fun reject(code: String, userInfo: WritableMap) = log(code)
        override fun reject(code: String, throwable: Throwable?, userInfo: WritableMap) = log(throwable?.message)
        override fun reject(code: String, message: String?, userInfo: WritableMap) = log(message)
        override fun reject(code: String?, message: String?, throwable: Throwable?, userInfo: WritableMap?) = log(message)

        @Deprecated("Deprecated in parent")
        override fun reject(message: String) = log(message)

        private fun log(message: String?) {
            TurboLog.w(TAG, "Failed to delete credentials for $serverUrl: $message")
        }
    }
}
