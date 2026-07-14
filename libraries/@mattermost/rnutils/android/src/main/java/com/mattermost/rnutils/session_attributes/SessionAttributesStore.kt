package com.mattermost.rnutils.session_attributes

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import java.security.MessageDigest

data class SAField(
    val name: String,
    val type: String,
    val ttlSeconds: Int,
    val gracePeriodSeconds: Int,
) {
    fun toJson(): JSONObject {
        return JSONObject().apply {
            put("name", name)
            put("type", type)
            put("ttl_seconds", ttlSeconds)
            put("grace_period_seconds", gracePeriodSeconds)
        }
    }

    companion object {
        fun fromJson(json: JSONObject): SAField? {
            val name = json.optString("name", "")
            val type = json.optString("type", "")
            if (name.isEmpty() || type.isEmpty()) {
                return null
            }
            return SAField(
                name = name,
                type = type,
                ttlSeconds = json.optInt("ttl_seconds", 0),
                gracePeriodSeconds = json.optInt("grace_period_seconds", 0),
            )
        }
    }
}

data class ServerSessionAttributesState(
    var enabled: Boolean,
    var manifest: MutableList<SAField>,
    var lastSentAt: MutableMap<String, Long>,
) {
    fun toJson(): JSONObject {
        val manifestArray = JSONArray()
        manifest.forEach { manifestArray.put(it.toJson()) }
        val lastSent = JSONObject()
        lastSentAt.forEach { (key, value) -> lastSent.put(key, value) }
        return JSONObject().apply {
            put("enabled", enabled)
            put("manifest", manifestArray)
            put("lastSentAt", lastSent)
        }
    }

    companion object {
        fun fromJson(json: JSONObject): ServerSessionAttributesState {
            val manifest = mutableListOf<SAField>()
            val manifestArray = json.optJSONArray("manifest")
            if (manifestArray != null) {
                for (i in 0 until manifestArray.length()) {
                    SAField.fromJson(manifestArray.getJSONObject(i))?.let { manifest.add(it) }
                }
            }
            val lastSentAt = mutableMapOf<String, Long>()
            val lastSent = json.optJSONObject("lastSentAt")
            if (lastSent != null) {
                lastSent.keys().forEach { key ->
                    lastSentAt[key] = lastSent.optLong(key)
                }
            }
            return ServerSessionAttributesState(
                enabled = json.optBoolean("enabled", false),
                manifest = manifest,
                lastSentAt = lastSentAt,
            )
        }
    }
}

class SessionAttributesStore(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences(
        SessionAttributesConstants.PREFS_NAME,
        Context.MODE_PRIVATE,
    )

    fun serverKey(serverUrl: String): String {
        val normalized = serverUrl.trimEnd('/')
        val digest = MessageDigest.getInstance("SHA-256").digest(normalized.toByteArray())
        return digest.joinToString("") { "%02x".format(it) }
    }

    private fun stateKey(serverUrl: String): String {
        return "${SessionAttributesConstants.STORE_PREFIX}state_${serverKey(serverUrl)}"
    }

    fun loadState(serverUrl: String): ServerSessionAttributesState? {
        val raw = prefs.getString(stateKey(serverUrl), null) ?: return null
        return try {
            ServerSessionAttributesState.fromJson(JSONObject(raw))
        } catch (_: Exception) {
            null
        }
    }

    fun saveState(serverUrl: String, state: ServerSessionAttributesState) {
        prefs.edit().putString(stateKey(serverUrl), state.toJson().toString()).apply()
    }

    fun removeState(serverUrl: String) {
        prefs.edit().remove(stateKey(serverUrl)).apply()
    }

    fun setEnabled(serverUrl: String, enabled: Boolean) {
        val state = loadState(serverUrl) ?: ServerSessionAttributesState(false, mutableListOf(), mutableMapOf())
        state.enabled = enabled
        if (!enabled) {
            state.manifest.clear()
            state.lastSentAt.clear()
        }
        saveState(serverUrl, state)
    }

    fun setManifest(serverUrl: String, manifest: List<SAField>) {
        val state = loadState(serverUrl) ?: ServerSessionAttributesState(true, mutableListOf(), mutableMapOf())
        state.enabled = true
        state.manifest = manifest.toMutableList()
        state.lastSentAt.clear()
        saveState(serverUrl, state)
    }

    fun upsertField(serverUrl: String, field: SAField) {
        val state = loadState(serverUrl)?.takeIf { it.enabled } ?: return
        val index = state.manifest.indexOfFirst { it.name == field.name }
        if (index == -1) {
            state.manifest.add(field)
        } else {
            state.manifest[index] = field
        }
        state.lastSentAt.remove(field.name)
        saveState(serverUrl, state)
    }

    fun removeField(serverUrl: String, name: String) {
        val state = loadState(serverUrl)?.takeIf { it.enabled } ?: return
        state.manifest.removeAll { it.name == name }
        state.lastSentAt.remove(name)
        saveState(serverUrl, state)
    }

    fun setStableValues(values: Map<String, String>) {
        val json = JSONObject()
        values.forEach { (key, value) -> json.put(key, value) }
        prefs.edit().putString(SessionAttributesConstants.STABLE_VALUES_KEY, json.toString()).apply()
    }

    fun getStableValue(name: String): String? {
        val raw = prefs.getString(SessionAttributesConstants.STABLE_VALUES_KEY, null) ?: return null
        return try {
            val value = JSONObject(raw).optString(name, "")
            if (value.isEmpty()) null else value
        } catch (_: Exception) {
            null
        }
    }
}
