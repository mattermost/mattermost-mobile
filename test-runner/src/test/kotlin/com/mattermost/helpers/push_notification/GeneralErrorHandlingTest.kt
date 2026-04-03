package com.mattermost.helpers.push_notification

import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import org.junit.Assert.*
import org.junit.Test
import org.mockito.Mockito.*

/**
 * Tests for the error-handling logic extracted into [formatErrorMessage].
 *
 * The fix guards against calling getMap("data") when the "data" field is not
 * actually a Map (e.g., when a proxy returns an HTML error page as a String),
 * and handles every ReadableType explicitly to avoid UnexpectedNativeTypeException.
 *
 * Sentry issue: MATTERMOST-MOBILE-ANDROID-AWY6
 * https://mattermost-mr.sentry.io/issues/6911684498/
 */
class GeneralErrorHandlingTest {

    @Test
    fun `when data is Map with valid status_code and message - formats error`() {
        val errorData = mock(ReadableMap::class.java).apply {
            `when`(hasKey("status_code")).thenReturn(true)
            `when`(hasKey("message")).thenReturn(true)
            `when`(getType("status_code")).thenReturn(ReadableType.Number)
            `when`(getType("message")).thenReturn(ReadableType.String)
            `when`(getInt("status_code")).thenReturn(401)
            `when`(getString("message")).thenReturn("Unauthorized")
        }
        val response = mock(ReadableMap::class.java).apply {
            `when`(hasKey("data")).thenReturn(true)
            `when`(getType("data")).thenReturn(ReadableType.Map)
            `when`(getMap("data")).thenReturn(errorData)
        }

        val msg = formatErrorMessage(response)
        assertEquals("Unexpected code 401 Unauthorized", msg)
    }

    @Test
    fun `when data is Map but missing status_code - falls back`() {
        val errorData = mock(ReadableMap::class.java).apply {
            `when`(hasKey("status_code")).thenReturn(false)
            `when`(hasKey("message")).thenReturn(true)
            `when`(getType("message")).thenReturn(ReadableType.String)
        }
        val response = mock(ReadableMap::class.java).apply {
            `when`(hasKey("data")).thenReturn(true)
            `when`(getType("data")).thenReturn(ReadableType.Map)
            `when`(getMap("data")).thenReturn(errorData)
        }

        val msg = formatErrorMessage(response)
        assertTrue(msg.startsWith("Unexpected response:"))
    }

    @Test
    fun `when data is Map but missing message - falls back`() {
        val errorData = mock(ReadableMap::class.java).apply {
            `when`(hasKey("status_code")).thenReturn(true)
            `when`(hasKey("message")).thenReturn(false)
            `when`(getType("status_code")).thenReturn(ReadableType.Number)
        }
        val response = mock(ReadableMap::class.java).apply {
            `when`(hasKey("data")).thenReturn(true)
            `when`(getType("data")).thenReturn(ReadableType.Map)
            `when`(getMap("data")).thenReturn(errorData)
        }

        val msg = formatErrorMessage(response)
        assertTrue(msg.startsWith("Unexpected response:"))
    }

    @Test
    fun `when data is Map but status_code is wrong type - falls back`() {
        val errorData = mock(ReadableMap::class.java).apply {
            `when`(hasKey("status_code")).thenReturn(true)
            `when`(hasKey("message")).thenReturn(true)
            `when`(getType("status_code")).thenReturn(ReadableType.String)
            `when`(getType("message")).thenReturn(ReadableType.String)
        }
        val response = mock(ReadableMap::class.java).apply {
            `when`(hasKey("data")).thenReturn(true)
            `when`(getType("data")).thenReturn(ReadableType.Map)
            `when`(getMap("data")).thenReturn(errorData)
        }

        val msg = formatErrorMessage(response)
        assertTrue(msg.startsWith("Unexpected response:"))
    }

    @Test
    fun `when data is Map but message is wrong type - falls back`() {
        val errorData = mock(ReadableMap::class.java).apply {
            `when`(hasKey("status_code")).thenReturn(true)
            `when`(hasKey("message")).thenReturn(true)
            `when`(getType("status_code")).thenReturn(ReadableType.Number)
            `when`(getType("message")).thenReturn(ReadableType.Number)
        }
        val response = mock(ReadableMap::class.java).apply {
            `when`(hasKey("data")).thenReturn(true)
            `when`(getType("data")).thenReturn(ReadableType.Map)
            `when`(getMap("data")).thenReturn(errorData)
        }

        val msg = formatErrorMessage(response)
        assertTrue(msg.startsWith("Unexpected response:"))
    }

    @Test
    fun `when data is Map but getMap returns null - falls back`() {
        val response = mock(ReadableMap::class.java).apply {
            `when`(hasKey("data")).thenReturn(true)
            `when`(getType("data")).thenReturn(ReadableType.Map)
            `when`(getMap("data")).thenReturn(null)
        }

        val msg = formatErrorMessage(response)
        assertEquals("Unexpected response: null", msg)
    }

    @Test
    fun `when data is String type - uses getString`() {
        val response = mock(ReadableMap::class.java).apply {
            `when`(hasKey("data")).thenReturn(true)
            `when`(getType("data")).thenReturn(ReadableType.String)
            `when`(getString("data")).thenReturn("<html>502 Bad Gateway</html>")
        }

        val msg = formatErrorMessage(response)
        assertEquals("Unexpected response: <html>502 Bad Gateway</html>", msg)
    }

    @Test
    fun `when data is Number type - uses getDouble`() {
        val response = mock(ReadableMap::class.java).apply {
            `when`(hasKey("data")).thenReturn(true)
            `when`(getType("data")).thenReturn(ReadableType.Number)
            `when`(getDouble("data")).thenReturn(42.0)
        }

        val msg = formatErrorMessage(response)
        assertEquals("Unexpected response: 42.0", msg)
    }

    @Test
    fun `when data is Boolean type - uses getBoolean`() {
        val response = mock(ReadableMap::class.java).apply {
            `when`(hasKey("data")).thenReturn(true)
            `when`(getType("data")).thenReturn(ReadableType.Boolean)
            `when`(getBoolean("data")).thenReturn(false)
        }

        val msg = formatErrorMessage(response)
        assertEquals("Unexpected response: false", msg)
    }

    @Test
    fun `when data is Array type - uses getArray`() {
        val response = mock(ReadableMap::class.java).apply {
            `when`(hasKey("data")).thenReturn(true)
            `when`(getType("data")).thenReturn(ReadableType.Array)
            `when`(getArray("data")).thenReturn(listOf("item1", "item2"))
        }

        val msg = formatErrorMessage(response)
        assertEquals("Unexpected response: [item1, item2]", msg)
    }

    @Test
    fun `when data is Null type - returns null string`() {
        val response = mock(ReadableMap::class.java).apply {
            `when`(hasKey("data")).thenReturn(true)
            `when`(getType("data")).thenReturn(ReadableType.Null)
        }

        val msg = formatErrorMessage(response)
        assertEquals("Unexpected response: null", msg)
    }

    @Test
    fun `when data key is missing - treats as Null`() {
        val response = mock(ReadableMap::class.java).apply {
            `when`(hasKey("data")).thenReturn(false)
        }

        val msg = formatErrorMessage(response)
        assertEquals("Unexpected response: null", msg)
    }
}
