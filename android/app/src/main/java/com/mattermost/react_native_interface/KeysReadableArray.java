package com.mattermost.react_native_interface;

import com.facebook.react.bridge.Dynamic;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableType;

import java.util.ArrayList;

/**
 * KeysReadableArray: Helper class that abstracts boilerplate
 */
public class KeysReadableArray implements ReadableArray {
    @Override
    public int size() {
        return 0;
    }

    @Override
    public boolean isNull(int index) {
        return false;
    }

    @Override
    public boolean getBoolean(int index) {
        return false;
    }

    @Override
    public double getDouble(int index) {
        return 0;
    }

    @Override
    public int getInt(int index) {
        return 0;
    }

    @Override
    public String getString(int index) {
        return null;
    }

    @Override
    public ReadableArray getArray(int index) {
        return null;
    }

    @Override
    public ReadableMap getMap(int index) {
        return null;
    }

    @Override
    public Dynamic getDynamic(int index) {
        return null;
    }

    @Override
    public ReadableType getType(int index) {
        return null;
    }

    @Override
    public ArrayList<Object> toArrayList() {
        return null;
    }
}
