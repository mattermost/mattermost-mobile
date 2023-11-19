package com.mattermost.helpers.database_extension

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.nozbe.watermelondb.WMDatabase

fun insertCategory(db: WMDatabase, category: ReadableMap) {
    try {
        val id = category.getString("id") ?: return
        val collapsed = false
        val displayName = category.getString("display_name")
        val muted = category.getBoolean("muted")
        val sortOrder = category.getInt("sort_order")
        val sorting = category.getString("sorting") ?: "recent"
        val teamId = category.getString("team_id")
        val type = category.getString("type")

        db.execute(
                """
                INSERT INTO Category
                (id, collapsed, display_name, muted, sort_order, sorting, team_id, type, _changed, _status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', 'created')
                """.trimIndent(),
                arrayOf(
                        id, collapsed, displayName, muted,
                        sortOrder / 10, sorting, teamId, type
                )
        )
    } catch (e: Exception) {
        e.printStackTrace()
    }
}

fun insertCategoryChannels(db: WMDatabase, categoryId: String, teamId: String, channelIds: ReadableArray) {
    try {
        for (i in 0 until channelIds.size()) {
            val channelId = channelIds.getString(i)
            val id = "${teamId}_$channelId"
            db.execute(
                    """
                    INSERT INTO CategoryChannel
                    (id, category_id, channel_id, sort_order, _changed, _status)
                    VALUES (?, ?, ?, ?, '', 'created')
                    """.trimIndent(),
                    arrayOf(id, categoryId, channelId, i)
            )
        }
    } catch (e: Exception) {
        e.printStackTrace()
    }
}

fun insertCategoriesWithChannels(db: WMDatabase, orderCategories: ReadableMap) {
    val categories = orderCategories.getArray("categories") ?: return
    for (i in 0 until categories.size()) {
        val category = categories.getMap(i)
        val id = category.getString("id")
        val teamId = category.getString("team_id")
        val channelIds = category.getArray("channel_ids")
        insertCategory(db, category)
        if (id != null && teamId != null) {
            channelIds?.let { insertCategoryChannels(db, id, teamId, it) }
        }
    }
}

fun insertChannelToDefaultCategory(db: WMDatabase, categoryChannels: ReadableArray) {
    try {
        for (i in 0 until categoryChannels.size()) {
            val cc = categoryChannels.getMap(i)
            val id = cc.getString("id")
            val categoryId = cc.getString("category_id")
            val channelId = cc.getString("channel_id")
            val count = countByColumn(db, "CategoryChannel", "category_id", categoryId)
            db.execute(
                    """
                        INSERT INTO CategoryChannel
                        (id, category_id, channel_id, sort_order, _changed, _status)
                        VALUES (?, ?, ?, ?, '', 'created')
                    """.trimIndent(),
                    arrayOf(id, categoryId, channelId, if (count > 0) count + 1 else count)
            )
        }
    } catch (e: Exception) {
        e.printStackTrace()
    }
}
