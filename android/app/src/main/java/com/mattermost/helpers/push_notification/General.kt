package com.mattermost.helpers.push_notification

import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.mattermost.helpers.Network
import com.mattermost.helpers.PushNotificationDataRunnable
import com.mattermost.helpers.ResolvePromise

import java.io.IOException

import kotlin.coroutines.suspendCoroutine

internal suspend fun PushNotificationDataRunnable.Companion.fetch(serverUrl: String, endpoint: String): ReadableMap? {
    return suspendCoroutine { cont ->
        Network.get(serverUrl, endpoint, null, object : ResolvePromise() {
            override fun resolve(value: Any?) {
                val response = value as ReadableMap?
                if (response != null && !response.getBoolean("ok")) {
                    // Server may return "data" as a Map (normal error response), String
                    // (e.g. HTML error pages, proxy errors), or other types. Handle each
                    // ReadableType explicitly to avoid UnexpectedNativeTypeException.
                    val dataType = if (response.hasKey("data")) response.getType("data") else ReadableType.Null
                    val errorMessage = when (dataType) {
                        ReadableType.Map -> {
                            val error = response.getMap("data")
                            "Unexpected code ${error?.getInt("status_code")} ${error?.getString("message")}"
                        }
                        ReadableType.String -> "Unexpected response: ${response.getString("data")}"
                        ReadableType.Number -> "Unexpected response: ${response.getDouble("data")}"
                        ReadableType.Boolean -> "Unexpected response: ${response.getBoolean("data")}"
                        ReadableType.Array -> "Unexpected response: ${response.getArray("data")}"
                        ReadableType.Null -> "Unexpected response: null"
                    }
                    cont.resumeWith(Result.failure(IOException(errorMessage)))
                } else {
                    cont.resumeWith(Result.success(response))
                }
            }

            override fun reject(code: String, message: String?) {
                cont.resumeWith(Result.failure(IOException("Unexpected code $code $message")))
            }

            override fun reject(throwable: Throwable) {
                cont.resumeWith(Result.failure(IOException("Unexpected code $throwable")))
            }
        })
    }
}

internal suspend fun PushNotificationDataRunnable.Companion.fetchWithPost(serverUrl: String, endpoint: String, options: ReadableMap?) : ReadableMap? {
    return suspendCoroutine { cont ->
        Network.post(serverUrl, endpoint, options, object : ResolvePromise() {
            override fun resolve(value: Any?) {
                val response = value as ReadableMap?
                cont.resumeWith(Result.success(response))
            }

            override fun reject(code: String, message: String?) {
                cont.resumeWith(Result.failure(IOException("Unexpected code $code $message")))
            }

            override fun reject(throwable: Throwable) {
                cont.resumeWith(Result.failure(IOException("Unexpected code $throwable")))
            }
        })
    }
}
