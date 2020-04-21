package com.mattermost.react_native_interface

import com.facebook.react.bridge.Dynamic
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import java.util.*

/**
 * KeysReadableArray: Helper class that abstracts boilerplate
 */
open class KeysReadableArray : ReadableArray {
    override fun size(): Int = 0
    override fun isNull(index: Int): Boolean = false
    override fun getBoolean(index: Int): Boolean = false
    override fun getDouble(index: Int): Double = 0.toDouble()
    override fun getInt(index: Int): Int = 0
    override fun getString(index: Int): String? = null
    override fun getArray(index: Int): ReadableArray? = null
    override fun getMap(index: Int): ReadableMap? = null

    // TODO: remove this !! and return a valid Dynamic instance
    override fun getDynamic(index: Int): Dynamic = null!!

    // TODO: remove this !! and return a valid ReadableType instance
    override fun getType(index: Int): ReadableType = null!!

    // TODO: remove this !! and return a valid ArrayList<Any> instance
    override fun toArrayList(): ArrayList<Any> = null!!
}
