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

    public static Integer queryPostSinceForChannel(String channelId, String serverUrl) {
        Database db = getDatabaseForServer(serverUrl);
        if (db != null) {
            String emptyArray[] = {};
            String postsInChannelQuery = "SELECT earliest, latest FROM PostsInChannel WHERE channel_id='" + channelId + "' ORDER BY latest DESC LIMIT 1";
            Cursor cursor1 = db.rawQuery(postsInChannelQuery, emptyArray);

            if (cursor1.getCount() == 1) {
                cursor1.moveToFirst();
                Integer earliest = cursor1.getInt(0);
                Integer latest = cursor1.getInt(1);
                cursor1.close();

                String postQuery = "SELECT create_at FROM POST WHERE channel_id='" + channelId +
                        "' AND delete_at=0 AND create_at BETWEEN " + earliest + " AND " + latest +
                        " ORDER BY create_at DESC LIMIT 1";
                Cursor cursor2 = db.rawQuery(postQuery, emptyArray);

                if (cursor2.getCount() == 1) {
                    cursor2.moveToFirst();
                    return cursor2.getInt(0);
                }
            }
        }

        return null;
    }

    public static boolean hasMyTeam(String teamId, String serverUrl) {
        Database db = getDatabaseForServer(serverUrl);
        if (db != null) {
            String emptyArray[] = {};
            String query = "SELECT * FROM MyTeam WHERE team_id='" + teamId + "'";
            Cursor cursor = db.rawQuery(query, emptyArray);

            return cursor.getCount() == 1;
        }

        return false;
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
