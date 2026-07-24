package com.mattermost.helpers.push_notification

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType

/**
 * Safely retrieves a Map value for the given key, returning null if the key
 * doesn't exist or the value is not of type Map. Prevents
 * UnexpectedNativeTypeException when the server returns unexpected types
 * (e.g., a String error message instead of a JSON object).
 */
fun ReadableMap.safeGetMap(key: String): ReadableMap? {
    if (!hasKey(key)) return null
    if (getType(key) != ReadableType.Map) return null
    return getMap(key)
}

/**
 * Safely retrieves an Array value for the given key, returning null if the key
 * doesn't exist or the value is not of type Array. Prevents
 * UnexpectedNativeTypeException when the server returns unexpected types.
 */
fun ReadableMap.safeGetArray(key: String): ReadableArray? {
    if (!hasKey(key)) return null
    if (getType(key) != ReadableType.Array) return null
    return getArray(key)
}
