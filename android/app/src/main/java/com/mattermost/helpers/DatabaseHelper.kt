package com.mattermost.helpers

import android.content.Context
import android.database.Cursor
import android.net.Uri
import com.facebook.react.bridge.WritableMap

import com.nozbe.watermelondb.WMDatabase

import java.lang.Exception

import org.json.JSONArray
import org.json.JSONObject

typealias QueryArgs = Array<Any?>

class DatabaseHelper {
    var defaultDatabase: WMDatabase? = null

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
        defaultDatabase = WMDatabase.getInstance(databasePath, context)
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

fun WritableMap.mapCursor(cursor: Cursor) {
    for (i in 0 until cursor.columnCount) {
        when (cursor.getType(i)) {
            Cursor.FIELD_TYPE_NULL -> putNull(cursor.getColumnName(i))
            Cursor.FIELD_TYPE_INTEGER -> putDouble(cursor.getColumnName(i), cursor.getDouble(i))
            Cursor.FIELD_TYPE_FLOAT -> putDouble(cursor.getColumnName(i), cursor.getDouble(i))
            Cursor.FIELD_TYPE_STRING -> putString(cursor.getColumnName(i), cursor.getString(i))
            else -> putString(cursor.getColumnName(i), "")
        }
    }
}
