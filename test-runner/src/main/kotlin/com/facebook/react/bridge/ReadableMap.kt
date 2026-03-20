package com.facebook.react.bridge

/**
 * Stub of React Native's ReadableMap interface for unit testing.
 * Only includes methods used by the code under test.
 */
interface ReadableMap {
    fun getBoolean(name: String): Boolean
    fun getInt(name: String): Int
    fun getString(name: String): String?
    fun getMap(name: String): ReadableMap?
    fun getType(name: String): ReadableType
    fun hasKey(name: String): Boolean
}
