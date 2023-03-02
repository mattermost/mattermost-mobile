package com.mattermost.helpers;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableArray;

import java.util.Map;

import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONException;

public class ReadableArrayUtils {
    public static JSONArray toJSONArray(ReadableArray readableArray) throws JSONException {
        JSONArray jsonArray = new JSONArray();

        for (int i = 0; i < readableArray.size(); i++) {
            ReadableType type = readableArray.getType(i);

            switch (type) {
                case Null:
                    jsonArray.put(i, null);
                    break;
                case Boolean:
                    jsonArray.put(i, readableArray.getBoolean(i));
                    break;
                case Number:
                    jsonArray.put(i, readableArray.getDouble(i));
                    break;
                case String:
                    jsonArray.put(i, readableArray.getString(i));
                    break;
                case Map:
                    jsonArray.put(i, ReadableMapUtils.toJSONObject(readableArray.getMap(i)));
                    break;
                case Array:
                    jsonArray.put(i, ReadableArrayUtils.toJSONArray(readableArray.getArray(i)));
                    break;
            }
        }

        return jsonArray;
    }

    public static Object[] toArray(JSONArray jsonArray) throws JSONException {
        Object[] array = new Object[jsonArray.length()];

        for (int i = 0; i < jsonArray.length(); i++) {
            Object value = jsonArray.get(i);

            if (value instanceof JSONObject) {
                value = ReadableMapUtils.toMap((JSONObject) value);
            }
            if (value instanceof JSONArray) {
                value = ReadableArrayUtils.toArray((JSONArray) value);
            }

            array[i] = value;
        }

        return array;
    }

    public static Object[] toArray(ReadableArray readableArray) {
        Object[] array = new Object[readableArray.size()];

        for (int i = 0; i < readableArray.size(); i++) {
            ReadableType type = readableArray.getType(i);

            switch (type) {
                case Null:
                    array[i] = null;
                    break;
                case Boolean:
                    array[i] = readableArray.getBoolean(i);
                    break;
                case Number:
                    array[i] = readableArray.getDouble(i);
                    break;
                case String:
                    array[i] = readableArray.getString(i);
                    break;
                case Map:
                    array[i] = ReadableMapUtils.toMap(readableArray.getMap(i));
                    break;
                case Array:
                    array[i] = ReadableArrayUtils.toArray(readableArray.getArray(i));
                    break;
            }
        }

        return array;
    }

    public static WritableArray toWritableArray(Object[] array) {
        WritableArray writableArray = Arguments.createArray();

        for (Object value : array) {
            if (value == null) {
                writableArray.pushNull();
            } else if (value instanceof Boolean) {
                writableArray.pushBoolean((Boolean) value);
            } else if (value instanceof Double) {
                writableArray.pushDouble((Double) value);
            } else if (value instanceof Integer) {
                writableArray.pushInt((Integer) value);
            } else if (value instanceof String) {
                writableArray.pushString((String) value);
            } else if (value instanceof Map) {
                writableArray.pushMap(ReadableMapUtils.toWritableMap((Map<String, Object>) value));
            } else if (value instanceof ReadableMap) {
                writableArray.pushMap((ReadableMap) value);
            }else if (value.getClass().isArray()) {
                writableArray.pushArray(ReadableArrayUtils.toWritableArray((Object[]) value));
            }
        }

        return writableArray;
    }
}
