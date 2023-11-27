package com.mattermost.helpers.database_extension

import com.nozbe.watermelondb.WMDatabase
import org.json.JSONArray
import org.json.JSONException

internal fun insertFiles(db: WMDatabase, files: JSONArray) {
    try {
        for (i in 0 until files.length()) {
            val file = files.getJSONObject(i)
            val id = file.getString("id")
            val extension = file.getString("extension")
            val miniPreview = try { file.getString("mini_preview") } catch (e: JSONException) { "" }
            val height = try { file.getInt("height") } catch (e: JSONException) { 0 }
            val mime = file.getString("mime_type")
            val name = file.getString("name")
            val postId = file.getString("post_id")
            val size = try { file.getDouble("size") } catch (e: JSONException) { 0 }
            val width = try { file.getInt("width") } catch (e: JSONException) { 0 }
            db.execute(
                    """
                    INSERT INTO File 
                    (id, extension, height, image_thumbnail, local_path, mime_type, name, post_id, size, width, _changed, _status) 
                    VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, ?, '', 'created')
                    """.trimIndent(),
                    arrayOf(
                            id, extension, height, miniPreview,
                            mime, name, postId, size, width
                    )
            )
        }
    } catch (e: Exception) {
        e.printStackTrace()
    }
}
