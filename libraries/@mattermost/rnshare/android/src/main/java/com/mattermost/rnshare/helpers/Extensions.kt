package com.mattermost.rnshare.helpers

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import org.json.JSONArray
import org.json.JSONObject

fun ReadableArray.toJson(): JSONArray {
    val jsonArray = JSONArray()
    for (i in 0 until this.size()) {
        when (this.getType(i)) {
            ReadableType.Null -> jsonArray.put(JSONObject.NULL)
            ReadableType.Boolean -> jsonArray.put(this.getBoolean(i))
            ReadableType.Number -> jsonArray.put(this.getDouble(i))
            ReadableType.String -> jsonArray.put(this.getString(i))
            ReadableType.Map -> jsonArray.put(this.getMap(i).toJson())
            ReadableType.Array -> jsonArray.put(this.getArray(i).toJson())
        }
    }
    return jsonArray
}

fun ReadableMap.toJson(): JSONObject {
    val jsonObject = JSONObject()
    val iterator = this.keySetIterator()
    while (iterator.hasNextKey()) {
        val key = iterator.nextKey()
        when (this.getType(key)) {
            ReadableType.Null -> jsonObject.put(key, JSONObject.NULL)
            ReadableType.Boolean -> jsonObject.put(key, this.getBoolean(key))
            ReadableType.Number -> jsonObject.put(key, this.getDouble(key))
            ReadableType.String -> jsonObject.put(key, this.getString(key))
            ReadableType.Map -> jsonObject.put(key, this.getMap(key)!!.toJson())
            ReadableType.Array -> jsonObject.put(key, this.getArray(key)!!.toJson())
        }
    }
    return jsonObject
}
