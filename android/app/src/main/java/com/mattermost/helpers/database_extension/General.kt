package com.mattermost.helpers.database_extension

import android.content.Context
import android.text.TextUtils
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableMap
import com.mattermost.helpers.DatabaseHelper
import com.nozbe.watermelondb.Database
import com.nozbe.watermelondb.mapCursor
import java.lang.Exception
import java.util.*

fun DatabaseHelper.getServerUrlForIdentifier(identifier: String): String? {
    try {
        val query = "SELECT url FROM Servers WHERE identifier=?"
        defaultDatabase!!.rawQuery(query, arrayOf(identifier)).use { cursor ->
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

fun DatabaseHelper.getDatabaseForServer(context: Context?, serverUrl: String): Database? {
    try {
        val query = "SELECT db_path FROM Servers WHERE url=?"
        defaultDatabase!!.rawQuery(query, arrayOf(serverUrl)).use { cursor ->
            if (cursor.count == 1) {
                cursor.moveToFirst()
                val databasePath = cursor.getString(0)
                return Database(databasePath, context!!)
            }
        }
    } catch (e: Exception) {
        e.printStackTrace()
        // let it fall to return null
    }
    return null
}

fun find(db: Database, tableName: String, id: String?): ReadableMap? {
    try {
        db.rawQuery(
                "SELECT * FROM $tableName WHERE id == ? LIMIT 1",
                arrayOf(id)
        ).use { cursor ->
            if (cursor.count <= 0) {
                return null
            }
            val resultMap = Arguments.createMap()
            cursor.moveToFirst()
            resultMap.mapCursor(cursor)
            return resultMap
        }
    } catch (e: Exception) {
        e.printStackTrace()
        return null
    }
}

fun queryIds(db: Database, tableName: String, ids: Array<String>): List<String> {
    val list: MutableList<String> = ArrayList()
    val args = TextUtils.join(",", Arrays.stream(ids).map { "?" }.toArray())
    try {
        @Suppress("UNCHECKED_CAST")
        db.rawQuery("SELECT DISTINCT id FROM $tableName WHERE id IN ($args)", ids as Array<Any?>).use { cursor ->
            if (cursor.count > 0) {
                while (cursor.moveToNext()) {
                    val index = cursor.getColumnIndex("id")
                    if (index >= 0) {
                        list.add(cursor.getString(index))
                    }
                }
            }
        }
    } catch (e: Exception) {
        e.printStackTrace()
    }
    return list
}

fun queryByColumn(db: Database, tableName: String, columnName: String, values: Array<Any?>): List<String> {
    val list: MutableList<String> = ArrayList()
    val args = TextUtils.join(",", Arrays.stream(values).map { "?" }.toArray())
    try {
        db.rawQuery("SELECT DISTINCT $columnName FROM $tableName WHERE $columnName IN ($args)", values).use { cursor ->
            if (cursor.count > 0) {
                while (cursor.moveToNext()) {
                    val index = cursor.getColumnIndex(columnName)
                    if (index >= 0) {
                        list.add(cursor.getString(index))
                    }
                }
            }
        }
    } catch (e: Exception) {
        e.printStackTrace()
    }
    return list
}
