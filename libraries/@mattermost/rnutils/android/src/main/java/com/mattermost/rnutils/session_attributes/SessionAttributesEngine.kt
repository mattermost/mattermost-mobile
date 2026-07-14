package com.mattermost.rnutils.session_attributes

import android.content.Context
import android.util.Base64
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import org.json.JSONArray
import org.json.JSONObject

class SessionAttributesEngine private constructor(context: Context) {
    private val appContext = context.applicationContext
    private val store = SessionAttributesStore(appContext)
    private val collector = SessionAttributesCollector(appContext, store)

    fun setEnabled(serverUrl: String, enabled: Boolean) {
        store.setEnabled(serverUrl, enabled)
    }

    fun removeServer(serverUrl: String) {
        store.removeState(serverUrl)
    }

    fun setManifest(serverUrl: String, manifest: JSONArray) {
        val fields = mutableListOf<SAField>()
        for (i in 0 until manifest.length()) {
            SAField.fromJson(manifest.getJSONObject(i))?.let { fields.add(it) }
        }
        if (fields.isEmpty()) {
            removeServer(serverUrl)
            return
        }
        store.setManifest(serverUrl, fields)
    }

    fun upsertManifestField(serverUrl: String, field: JSONObject) {
        SAField.fromJson(field)?.let { store.upsertField(serverUrl, it) }
    }

    fun removeManifestField(serverUrl: String, name: String) {
        store.removeField(serverUrl, name)
    }

    fun setStableValues(values: Map<String, String>) {
        store.setStableValues(values)
    }

    fun getOutboundHeader(serverUrl: String): String? {
        val state = store.loadState(serverUrl) ?: return null
        if (!state.enabled || state.manifest.isEmpty()) {
            return null
        }

        val now = System.currentTimeMillis()
        val payload = JSONObject()

        for (field in state.manifest) {
            val lastSent = state.lastSentAt[field.name]
            val shouldSend = lastSent == null || field.ttlSeconds == 0 ||
                (now - lastSent) >= field.ttlSeconds * 1000L
            if (!shouldSend) {
                continue
            }

            val value = collector.collect(field.name, serverUrl)
            if (value.isEmpty()) {
                continue
            }

            payload.put(field.name, value)
            state.lastSentAt[field.name] = now
        }

        if (payload.length() == 0) {
            return null
        }

        store.saveState(serverUrl, state)

        return Base64.encodeToString(payload.toString().toByteArray(), Base64.NO_WRAP)
    }

    companion object {
        @Volatile
        private var instance: SessionAttributesEngine? = null

        fun getInstance(context: Context): SessionAttributesEngine {
            return instance ?: synchronized(this) {
                instance ?: SessionAttributesEngine(context).also { instance = it }
            }
        }

        @JvmStatic
        fun getSessionAttributesHeader(context: Context, serverUrl: String): String? {
            return getInstance(context).getOutboundHeader(serverUrl)
        }

        @JvmStatic
        fun withSessionAttributesHeader(context: Context, serverUrl: String, options: ReadableMap?): ReadableMap {
            val header = getSessionAttributesHeader(context, serverUrl) ?: return options ?: Arguments.createMap()
            val result = Arguments.createMap()
            val headers = Arguments.createMap()

            if (options != null && options.hasKey("headers")) {
                val existing = options.getMap("headers")
                if (existing != null) {
                    val iterator = existing.keySetIterator()
                    while (iterator.hasNextKey()) {
                        val key = iterator.nextKey()
                        when (existing.getType(key)) {
                            ReadableType.String -> headers.putString(key, existing.getString(key))
                            ReadableType.Boolean -> headers.putBoolean(key, existing.getBoolean(key))
                            ReadableType.Number -> headers.putDouble(key, existing.getDouble(key))
                            else -> {}
                        }
                    }
                }
                val iterator = options.keySetIterator()
                while (iterator.hasNextKey()) {
                    val key = iterator.nextKey()
                    if (key != "headers") {
                        when (options.getType(key)) {
                            ReadableType.String -> result.putString(key, options.getString(key))
                            ReadableType.Boolean -> result.putBoolean(key, options.getBoolean(key))
                            ReadableType.Number -> result.putDouble(key, options.getDouble(key))
                            ReadableType.Map -> result.putMap(key, options.getMap(key))
                            else -> {}
                        }
                    }
                }
            }

            headers.putString(SessionAttributesConstants.HEADER_NAME, header)
            result.putMap("headers", headers)
            return result
        }
    }
}
