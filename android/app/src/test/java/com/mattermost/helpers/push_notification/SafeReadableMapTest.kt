package com.mattermost.helpers.push_notification

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.`when`

class SafeReadableMapTest {

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
    fun safeGetMap_returnsNull_whenTypeIsString() {
        val map = mock(ReadableMap::class.java)
        `when`(map.hasKey("data")).thenReturn(true)
        `when`(map.getType("data")).thenReturn(ReadableType.String)

        assertNull(map.safeGetMap("data"))
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

    @Test
    fun safeGetArray_returnsNull_whenTypeIsString() {
        val map = mock(ReadableMap::class.java)
        `when`(map.hasKey("data")).thenReturn(true)
        `when`(map.getType("data")).thenReturn(ReadableType.String)

        assertNull(map.safeGetArray("data"))
    }
}
