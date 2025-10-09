package com.mattermost.helpers

import android.webkit.CookieManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.mattermost.turbolog.TurboLog
import java.net.HttpCookie


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
            val cookieString = CookieManager.getInstance().getCookie(serverUrl)
            val cookiesMap = createCookieList(cookieString)
            return cookiesMap.getString("MMCSRF")
        } catch (e: Exception) {
            TurboLog.d("HeadersHelper", "Error getting CSRF cookie token: ${e.message}")
            return null
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
