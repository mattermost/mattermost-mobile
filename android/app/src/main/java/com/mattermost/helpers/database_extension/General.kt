package com.mattermost.helpers.database_extension

import android.content.Context
import android.text.TextUtils
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableMap
import com.mattermost.helpers.DatabaseHelper
import com.nozbe.watermelondb.Database
import com.nozbe.watermelondb.QueryArgs
import com.nozbe.watermelondb.mapCursor
import java.util.*
import kotlin.Exception

internal fun DatabaseHelper.saveToDatabase(db: Database, data: ReadableMap, teamId: String?, channelId: String?, receivingThreads: Boolean) {
    db.transaction {
        val posts = data.getMap("posts")
        data.getMap("team")?.let { insertTeam(db, it) }
        data.getMap("myTeam")?.let { insertMyTeam(db, it) }
        data.getMap("channel")?.let { handleChannel(db, it) }
        data.getMap("myChannel")?.let { handleMyChannel(db, it, posts, receivingThreads) }
        data.getMap("categories")?.let { insertCategoriesWithChannels(db, it) }
        data.getArray("categoryChannels")?.let { insertChannelToDefaultCategory(db, it) }
        if (channelId != null) {
            handlePosts(db, posts, channelId, receivingThreads)
        }
        data.getArray("threads")?.let {
            val threadsArray = ArrayList<ReadableMap>()
            for (i in 0 until it.size()) {
                threadsArray.add(it.getMap(i))
            }
            handleThreads(db, threadsArray, teamId)
        }
        data.getArray("users")?.let { handleUsers(db, it) }
    }
}

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

fun findByColumns(db: Database, tableName: String, columnNames: Array<String>, values: QueryArgs): ReadableMap? {
    try {
        val whereString = columnNames.joinToString(" AND ") { "$it = ?" }
        db.rawQuery(
                "SELECT * FROM $tableName WHERE $whereString LIMIT 1",
                values
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

fun countByColumn(db: Database, tableName: String, columnName: String, value: Any?): Int {
    try {
        db.rawQuery(
                "SELECT COUNT(*) FROM $tableName WHERE $columnName == ? LIMIT 1",
                arrayOf(value)
        ).use { cursor ->
            if (cursor.count <= 0) {
                return 0
            }
            cursor.moveToFirst()
            return cursor.getInt(0)
        }
    } catch (e: Exception) {
        e.printStackTrace()
        return 0
    }
}
