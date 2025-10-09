package com.mattermost.helpers

import android.os.Handler
import android.os.Looper
import android.webkit.CookieManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.mattermost.turbolog.TurboLog
import java.net.HttpCookie
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit


object HeadersHelper {
    fun getHeadersWithCredentials(serverUrl: String, includeCsrfToken: Boolean = false): WritableMap {
        val headers = Arguments.createMap()
        
        if (includeCsrfToken) {
            val csrfToken = getCSRFCookieToken(serverUrl)
            if (csrfToken != null && csrfToken.isNotEmpty()) {
                headers.putString("X-CSRF-Token", csrfToken)
            }
        }
        
        return headers
    }

    private fun getCSRFCookieToken(serverUrl: String): String? {
        try {
            val cookieString = getCookieOnMainThread(serverUrl)
            val cookiesMap = createCookieList(cookieString)
            return cookiesMap.getString("MMCSRF")
        } catch (e: Exception) {
            TurboLog.d("HeadersHelper", "Error getting CSRF cookie token: ${e.message}")
            return null
        }
    }

    private fun getCookieOnMainThread(serverUrl: String): String? {
        // Check if we're already on the main thread
        if (Looper.myLooper() == Looper.getMainLooper()) {
            return CookieManager.getInstance().getCookie(serverUrl)
        }

        // If not on main thread, use CountDownLatch to synchronously wait for result
        val latch = CountDownLatch(1)
        var cookieString: String? = null
        var exception: Exception? = null

        Handler(Looper.getMainLooper()).post {
            try {
                cookieString = CookieManager.getInstance().getCookie(serverUrl)
            } catch (e: Exception) {
                exception = e
            } finally {
                latch.countDown()
            }
        }

        // Wait for the result with a timeout to avoid blocking indefinitely
        return try {
            if (latch.await(5, TimeUnit.SECONDS)) {
                if (exception != null) {
                    throw exception!!
                }
                cookieString
            } else {
                TurboLog.w("HeadersHelper", "Timeout waiting for cookie retrieval on main thread")
                null
            }
        } catch (e: InterruptedException) {
            TurboLog.w("HeadersHelper", "Interrupted while waiting for cookie retrieval: ${e.message}")
            null
        }
    }

    private fun createCookieList(allCookies: String?): WritableMap {
        val allCookiesMap = Arguments.createMap()

        if (!allCookies.isNullOrEmpty()) {
            val cookieHeaders = allCookies.split(";")
            for (singleCookie in cookieHeaders) {
                val cookies = HttpCookie.parse(singleCookie)
                for (cookie in cookies) {
                    val name = cookie.name
                    val value = cookie.value
                    if (!name.isNullOrEmpty() && !value.isNullOrEmpty()) {
                        allCookiesMap.putString(name, value)
                    }
                }
            }
        }

        return allCookiesMap
    }
}
