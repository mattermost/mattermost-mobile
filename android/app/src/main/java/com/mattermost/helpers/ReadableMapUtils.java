package com.mattermost.helpers;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableMap;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

public class ReadableMapUtils {
    public static JSONObject toJSONObject(ReadableMap readableMap) throws JSONException {
        JSONObject jsonObject = new JSONObject();

        ReadableMapKeySetIterator iterator = readableMap.keySetIterator();

        while (iterator.hasNextKey()) {
            String key = iterator.nextKey();
            ReadableType type = readableMap.getType(key);

            switch (type) {
                case Null:
                    jsonObject.put(key, null);
                    break;
                case Boolean:
                    jsonObject.put(key, readableMap.getBoolean(key));
                    break;
                case Number:
                    jsonObject.put(key, readableMap.getDouble(key));
                    break;
                case String:
                    jsonObject.put(key, readableMap.getString(key));
                    break;
                case Map:
                    ReadableMap map = readableMap.getMap(key);
                    if (map != null) {
                        jsonObject.put(key, ReadableMapUtils.toJSONObject(map));
                    }
                    break;
                case Array:
                    ReadableArray array = readableMap.getArray(key);
                    if (array != null) {
                        jsonObject.put(key, ReadableArrayUtils.toJSONArray(array));
                    }
                    break;
            }
        }

        return jsonObject;
    }

    public static Map<String, Object> toMap(JSONObject jsonObject) throws JSONException {
        Map<String, Object> map = new HashMap<>();
        Iterator<String> iterator = jsonObject.keys();

        while (iterator.hasNext()) {
            String key = iterator.next();
            Object value = jsonObject.get(key);

            if (value instanceof JSONObject) {
                value = ReadableMapUtils.toMap((JSONObject) value);
            }
            if (value instanceof JSONArray) {
                value = ReadableArrayUtils.toArray((JSONArray) value);
            }

            map.put(key, value);
        }

        return map;
    }

    public static Map<String, Object> toMap(ReadableMap readableMap) {
        Map<String, Object> map = new HashMap<>();
        ReadableMapKeySetIterator iterator = readableMap.keySetIterator();

        while (iterator.hasNextKey()) {
            String key = iterator.nextKey();
            ReadableType type = readableMap.getType(key);

            switch (type) {
                case Null:
                    map.put(key, null);
                    break;
                case Boolean:
                    map.put(key, readableMap.getBoolean(key));
                    break;
                case Number:
                    map.put(key, readableMap.getDouble(key));
                    break;
                case String:
                    map.put(key, readableMap.getString(key));
                    break;
                case Map:
                    ReadableMap obj = readableMap.getMap(key);
                    if (obj != null) {
                        map.put(key, ReadableMapUtils.toMap(obj));
                    }
                    break;
                case Array:
                    ReadableArray array = readableMap.getArray(key);
                    if (array != null) {
                        map.put(key, ReadableArrayUtils.toArray(array));
                    }
                    break;
            }
        }

        return map;
    }

    public static WritableMap toWritableMap(Map<String, Object> map) {
        WritableMap writableMap = Arguments.createMap();
        Iterator<Map.Entry<String, Object>> iterator = map.entrySet().iterator();

        while (iterator.hasNext()) {
            Map.Entry<String, Object> pair = iterator.next();
            Object value = pair.getValue();

            if (value == null) {
                writableMap.putNull(pair.getKey());
            } else if (value instanceof Boolean) {
                writableMap.putBoolean(pair.getKey(), (Boolean) value);
            } else if (value instanceof Double) {
                writableMap.putDouble(pair.getKey(), (Double) value);
            } else if (value instanceof Integer) {
                writableMap.putInt(pair.getKey(), (Integer) value);
            } else if (value instanceof String) {
                writableMap.putString(pair.getKey(), (String) value);
            } else if (value instanceof Map)
                writableMap.putMap(pair.getKey(), ReadableMapUtils.toWritableMap((Map<String, Object>) value));
            else if (value.getClass().isArray()) {
                writableMap.putArray(pair.getKey(), ReadableArrayUtils.toWritableArray((Object[]) value));
            }

            iterator.remove();
        }

        return writableMap;
    }
}
