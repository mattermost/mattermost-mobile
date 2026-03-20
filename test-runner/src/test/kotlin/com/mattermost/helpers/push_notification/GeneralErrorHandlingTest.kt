package com.mattermost.helpers.push_notification

import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import org.junit.Assert.*
import org.junit.Test
import org.mockito.Mockito.*

/**
 * Tests for the error-handling logic in General.kt's fetch() function.
 *
 * The fix guards against calling getMap("data") when the "data" field is not
 * actually a Map (e.g., when a proxy returns an HTML error page as a String).
 *
 * Sentry issue: MATTERMOST-MOBILE-ANDROID-AWY6
 * https://mattermost-mr.sentry.io/issues/6911684498/
 */
class GeneralErrorHandlingTest {

    /**
     * Simulates the error-handling branch from fetch().
     * This mirrors the exact logic in General.kt lines 19-25.
     */
    private fun extractErrorMessage(response: ReadableMap): String {
        return if (response.getType("data") == ReadableType.Map) {
            val error = response.getMap("data")
            "Unexpected code ${error?.getInt("status_code")} ${error?.getString("message")}"
        } else {
            "Unexpected response: ${response.getString("data")}"
        }
    }

    @Test
    fun `when data is Map type - extracts status_code and message`() {
        val errorData = mock(ReadableMap::class.java).apply {
            `when`(getInt("status_code")).thenReturn(401)
            `when`(getString("message")).thenReturn("Unauthorized")
        }
        val response = mock(ReadableMap::class.java).apply {
            `when`(getType("data")).thenReturn(ReadableType.Map)
            `when`(getMap("data")).thenReturn(errorData)
        }

        val msg = extractErrorMessage(response)
        assertEquals("Unexpected code 401 Unauthorized", msg)
    }

    @Test
    fun `when data is String type - falls back to getString`() {
        val response = mock(ReadableMap::class.java).apply {
            `when`(getType("data")).thenReturn(ReadableType.String)
            `when`(getString("data")).thenReturn("<html>502 Bad Gateway</html>")
        }

        val msg = extractErrorMessage(response)
        assertEquals("Unexpected response: <html>502 Bad Gateway</html>", msg)
    }

    @Test
    fun `when data is Null type - falls back to getString returning null`() {
        val response = mock(ReadableMap::class.java).apply {
            `when`(getType("data")).thenReturn(ReadableType.Null)
            `when`(getString("data")).thenReturn(null)
        }

        val msg = extractErrorMessage(response)
        assertEquals("Unexpected response: null", msg)
    }

    @Test
    fun `when data is Number type - does not call getMap`() {
        val response = mock(ReadableMap::class.java).apply {
            `when`(getType("data")).thenReturn(ReadableType.Number)
            `when`(getString("data")).thenReturn("42")
        }

        val msg = extractErrorMessage(response)
        assertEquals("Unexpected response: 42", msg)
        verify(response, never()).getMap("data")
    }

    @Test
    fun `when data is Map with null error - handles gracefully`() {
        val response = mock(ReadableMap::class.java).apply {
            `when`(getType("data")).thenReturn(ReadableType.Map)
            `when`(getMap("data")).thenReturn(null)
        }

        val msg = extractErrorMessage(response)
        assertEquals("Unexpected code null null", msg)
    }
}
