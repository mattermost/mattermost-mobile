package com.mattermost.react_native_interface;

import android.content.Context;
import android.database.Cursor;
import android.text.TextUtils;

import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.modules.storage.ReactDatabaseSupplier;

import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;

/**
 * AsyncStorageHelper: Class that accesses React Native AsyncStorage Database synchronously
 */
public class AsyncStorageHelper {

    // Static variables from: com.facebook.react.modules.storage.ReactDatabaseSupplier
    static final String TABLE_CATALYST = "catalystLocalStorage";
    static final String KEY_COLUMN = "key";
    static final String VALUE_COLUMN = "value";


    private static final int MAX_SQL_KEYS = 999;

    Context mReactContext = null;

    public AsyncStorageHelper(Context mReactContext) {
        this.mReactContext = mReactContext;
    }

    public HashMap<String, String> multiGet(ReadableArray keys) {
        HashMap<String, String> results = new HashMap<>(keys.size());

        HashSet<String> keysRemaining = new HashSet<>();
        String[] columns = {KEY_COLUMN, VALUE_COLUMN};
        ReactDatabaseSupplier reactDatabaseSupplier = ReactDatabaseSupplier.getInstance(this.mReactContext);
        for (int keyStart = 0; keyStart < keys.size(); keyStart += MAX_SQL_KEYS) {
            int keyCount = Math.min(keys.size() - keyStart, MAX_SQL_KEYS);
            Cursor cursor = reactDatabaseSupplier.get().query(
                    TABLE_CATALYST,
                    columns,
                    buildKeySelection(keyCount),
                    buildKeySelectionArgs(keys, keyStart, keyCount),
                    null,
                    null,
                    null);
            keysRemaining.clear();

            try {
                if (cursor.getCount() != keys.size()) {
                    // some keys have not been found - insert them with null into the final array
                    for (int keyIndex = keyStart; keyIndex < keyStart + keyCount; keyIndex++) {
                        keysRemaining.add(keys.getString(keyIndex));
                    }
                }

                if (cursor.moveToFirst()) {
                    do {
                        results.put(cursor.getString(0), cursor.getString(1));
                        keysRemaining.remove(cursor.getString(0));
                    } while (cursor.moveToNext());
                }
            } catch (Exception e) {
                return new HashMap<>(1);
            } finally {
                cursor.close();
            }

            for (String key : keysRemaining) {
                results.put(key, null);
            }
            keysRemaining.clear();
        }

        return results;
    }

    private static String buildKeySelection(int selectionCount) {
        String[] list = new String[selectionCount];
        Arrays.fill(list, "?");
        return KEY_COLUMN + " IN (" + TextUtils.join(", ", list) + ")";
    }

    private static String[] buildKeySelectionArgs(ReadableArray keys, int start, int count) {
        String[] selectionArgs = new String[count];
        for (int keyIndex = 0; keyIndex < count; keyIndex++) {
            selectionArgs[keyIndex] = keys.getString(start + keyIndex);
        }
        return selectionArgs;
    }
}
