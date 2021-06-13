package com.mattermost.helpers;

import android.content.Context;
import android.database.Cursor;
import android.net.Uri;

import com.nozbe.watermelondb.Database;

public class DatabaseHelper {
    private static final String DEFAULT_DATABASE_NAME = "default.db";
    private static Database defaultDatabase;

    private static void setDefaultDatabase(Context context) {
        String databaseName = Uri.fromFile(context.getFilesDir()).toString() + "/" + DEFAULT_DATABASE_NAME;
        defaultDatabase = new Database(databaseName, context);
    }

    public static String getOnlyServerUrl(Context context) {
        if (defaultDatabase == null) {
            setDefaultDatabase(context);
        }

        String emptyArray[] = {};
        String query = "SELECT url FROM servers";
        Cursor cursor = defaultDatabase.rawQuery(query, emptyArray);

        if (cursor.getCount() == 1) {
            cursor.moveToFirst();
            return cursor.getString(0);
        }

        return null;
    }
}
