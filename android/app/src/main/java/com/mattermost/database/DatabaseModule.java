package com.mattermost.database;

import android.database.Cursor;
import android.util.Log;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.nozbe.watermelondb.Database;


public class DatabaseModule extends ReactContextBaseJavaModule {
    private static Database defaultDatabase;
    private ReactApplicationContext reactContext;

    public DatabaseModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "MattermostDatabase";
    }

    @ReactMethod
    public void setDefaultDatabase(String databaseName) {
        this.defaultDatabase = new Database(databaseName, reactContext);
    }

    public static String getOnlyServerUrl() {
        if (defaultDatabase != null) {
            String emptyArray[] = {};
            String query = "SELECT url FROM servers";
            Cursor cursor = defaultDatabase.rawQuery(query, emptyArray);

            if (cursor.getCount() == 1) {
                cursor.moveToFirst();
                return cursor.getString(0);
            }
        }

        return null;
    }
}
