package com.mattermost.helpers

import android.content.Context
import android.net.Uri

import com.nozbe.watermelondb.Database

import java.lang.Exception

import org.json.JSONArray
import org.json.JSONObject

class DatabaseHelper {
    var defaultDatabase: Database? = null

    val onlyServerUrl: String?
        get() {
            try {
                val query = "SELECT url FROM Servers WHERE last_active_at != 0 AND identifier != ''"
                defaultDatabase!!.rawQuery(query).use { cursor ->
                    if (cursor.count == 1) {
                        cursor.moveToFirst()
                        return cursor.getString(0)
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
                // let it fall to return null
            }
            return null
        }

    fun init(context: Context) {
        if (defaultDatabase == null) {
            setDefaultDatabase(context)
        }
    }

    private fun setDefaultDatabase(context: Context) {
        val databaseName = "app.db"
        val databasePath = Uri.fromFile(context.filesDir).toString() + "/" + databaseName
        defaultDatabase = Database(databasePath, context)
    }

    internal fun JSONObject.toMap(): Map<String, Any?> = keys().asSequence().associateWith { it ->
        when (val value = this[it])
        {
            is JSONArray ->
            {
                val map = (0 until value.length()).associate { Pair(it.toString(), value[it]) }
                JSONObject(map).toMap().values.toList()
            }
            is JSONObject -> {
                value.toMap()
            }
            JSONObject.NULL -> {
                null
            }
            else            -> {
                value
            }
        }
    }

    companion object {
        var instance: DatabaseHelper? = null
            get() {
                if (field == null) {
                    field = DatabaseHelper()
                }
                return field
            }
            private set
    }
}
