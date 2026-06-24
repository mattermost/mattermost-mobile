package com.mattermost.helpers.push_notification

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.fail
import org.junit.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.`when`

/**
 * Tests for safeGetMap/safeGetArray extension functions.
 *
 * The "crash" tests simulate the real ReadableNativeMap behavior: calling
 * getMap() on a String-typed field throws UnexpectedNativeTypeException.
 * We configure the mock to throw on that call, proving the unsafe pattern
 * crashes and the safe pattern doesn't.
 */
class SafeReadableMapTest {

    /**
     * Reproduces Sentry #6306939631: server returns "data" as a String
     * (e.g. HTML error page). Calling getMap("data") directly throws,
     * exactly as ReadableNativeMap does in production.
     */
    @Test(expected = RuntimeException::class)
    fun getMap_throws_whenTypeIsString() {
        val map = mockMapWithStringData()

        // This is what the old code did — crashes in production
        map.getMap("data")
    }

    /**
     * The fix: safeGetMap checks the type first and returns null instead
     * of crashing.
     */
    @Test
    fun safeGetMap_returnsNull_whenTypeIsString() {
        val map = mockMapWithStringData()

        // Safe version returns null — no crash
        assertNull(map.safeGetMap("data"))
    }

    /**
     * Same pattern for arrays: getArray("data") throws when "data" is a
     * String. This covers the User.kt callsites.
     */
    @Test(expected = RuntimeException::class)
    fun getArray_throws_whenTypeIsString() {
        val map = mockMapWithStringData()

        // Crashes in production
        map.getArray("data")
    }

    @Test
    fun safeGetArray_returnsNull_whenTypeIsString() {
        val map = mockMapWithStringData()

        assertNull(map.safeGetArray("data"))
    }

    @Test
    fun safeGetMap_returnsMap_whenTypeIsMap() {
        val innerMap = mock(ReadableMap::class.java)
        val map = mock(ReadableMap::class.java)
        `when`(map.hasKey("data")).thenReturn(true)
        `when`(map.getType("data")).thenReturn(ReadableType.Map)
        `when`(map.getMap("data")).thenReturn(innerMap)

        assertEquals(innerMap, map.safeGetMap("data"))
    }

    @Test
    fun safeGetMap_returnsNull_whenKeyMissing() {
        val map = mock(ReadableMap::class.java)
        `when`(map.hasKey("data")).thenReturn(false)

        assertNull(map.safeGetMap("data"))
    }

    @Test
    fun safeGetArray_returnsArray_whenTypeIsArray() {
        val innerArray = mock(ReadableArray::class.java)
        val map = mock(ReadableMap::class.java)
        `when`(map.hasKey("data")).thenReturn(true)
        `when`(map.getType("data")).thenReturn(ReadableType.Array)
        `when`(map.getArray("data")).thenReturn(innerArray)

        assertEquals(innerArray, map.safeGetArray("data"))
    }

    /**
     * Creates a mock ReadableMap where "data" is a String — simulating a
     * server error response. getMap() and getArray() are configured to throw
     * RuntimeException, matching ReadableNativeMap's real behavior of throwing
     * UnexpectedNativeTypeException (which extends RuntimeException).
     */
    private fun mockMapWithStringData(): ReadableMap {
        val map = mock(ReadableMap::class.java)
        `when`(map.hasKey("data")).thenReturn(true)
        `when`(map.getType("data")).thenReturn(ReadableType.String)
        `when`(map.getMap("data")).thenThrow(
            RuntimeException("Value for data cannot be cast from String to ReadableNativeMap")
        )
        `when`(map.getArray("data")).thenThrow(
            RuntimeException("Value for data cannot be cast from String to ReadableNativeArray")
        )
        return map
    }
}
