package com.mattermost.helpers

import android.content.Context
import com.mattermost.helpers.database_extension.getDatabaseForServer
import com.mattermost.helpers.database_extension.insertOrUpdateDraft
import com.nozbe.watermelondb.WMDatabase
import org.json.JSONArray

class DraftDataHelper(private val context: Context) {
    private val dbHelper = DatabaseHelper.instance!!

    fun saveDraft(
        serverUrl: String,
        channelId: String,
        message: String,
        files: JSONArray
    ) {
        try {
            dbHelper.init(context.applicationContext)
            val db: WMDatabase? = dbHelper.getDatabaseForServer(context, serverUrl)

            if (db != null) {
                dbHelper.insertOrUpdateDraft(db, channelId, message, files)
                db.close()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
