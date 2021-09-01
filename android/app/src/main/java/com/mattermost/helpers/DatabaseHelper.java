package com.mattermost.helpers;

import android.content.Context;
import android.database.Cursor;
import android.net.Uri;

import com.nozbe.watermelondb.Database;

public class DatabaseHelper {
    private static final String DEFAULT_DATABASE_NAME = "app.db";
    private static Database defaultDatabase;
    private static Context context;

    public static void init(Context ctx) {
        if (context == null) {
            context = ctx;
            setDefaultDatabase();
        }
    }

    public static String getOnlyServerUrl() {
        String emptyArray[] = {};
        String query = "SELECT url FROM Servers";
        Cursor cursor = defaultDatabase.rawQuery(query, emptyArray);

        if (cursor.getCount() == 1) {
            cursor.moveToFirst();
            return cursor.getString(0);
        }

        return null;
    }

    public static String queryCurrentUserId(String serverUrl) {
        String emptyArray[] = {};
        String query = "SELECT value FROM System WHERE id='currentUserId'";
        Cursor cursor = defaultDatabase.rawQuery(query, emptyArray);

        if (cursor.getCount() == 1) {
            cursor.moveToFirst();
            return cursor.getString(0);
        }

        return null;
    }

    private static void setDefaultDatabase() {
        String databasePath = Uri.fromFile(context.getFilesDir()).toString() + "/" + DEFAULT_DATABASE_NAME;
        defaultDatabase = new Database(databasePath, context);
    }

    private static Database getDatabaseForServer(String serverUrl) {
        String emptyArray[] = {};
        String query = "SELECT db_path FROM Servers WHERE url='" + serverUrl + "'";
        Cursor cursor = defaultDatabase.rawQuery(query, emptyArray);

        if (cursor.getCount() == 1) {
            cursor.moveToFirst();
            String databasePath = cursor.getString(0);

            return new Database(databasePath, context);
        }

        return null;
    }
}
