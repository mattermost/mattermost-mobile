package com.mattermost.callsnative.utils

import android.util.Log
import java.lang.reflect.Method

/**
 * Thin shim around the host app's `com.mattermost.turbolog.TurboLog` so this
 * library's logs land in the same persisted log file as the rest of the app.
 *
 */
internal object TurboLogger {
    private val binding: Binding? = resolve()

    fun d(tag: String, message: String) = invoke(binding?.d, tag, message) ?: Log.d(tag, message)
    fun i(tag: String, message: String) = invoke(binding?.i, tag, message) ?: Log.i(tag, message)
    fun w(tag: String, message: String) = invoke(binding?.w, tag, message) ?: Log.w(tag, message)
    fun e(tag: String, message: String) = invoke(binding?.e, tag, message) ?: Log.e(tag, message)

    private fun invoke(method: Method?, tag: String, message: String): Int? {
        if (method == null || binding == null) return null
        return try {
            method.invoke(binding.companion, tag, message)
            0
        } catch (t: Throwable) {
            Log.w("MMCalls/TurboLogger", "TurboLog invoke failed: ${t.message}")
            null
        }
    }

    private data class Binding(val companion: Any, val d: Method, val i: Method, val w: Method, val e: Method)

    private fun resolve(): Binding? = try {
        val companionClass = Class.forName("com.mattermost.turbolog.TurboLog\$Companion")
        val companionInstance = Class.forName("com.mattermost.turbolog.TurboLog")
            .getField("Companion")
            .get(null) ?: return null
        Binding(
            companion = companionInstance,
            d = companionClass.getMethod("d", String::class.java, String::class.java),
            i = companionClass.getMethod("i", String::class.java, String::class.java),
            w = companionClass.getMethod("w", String::class.java, String::class.java),
            e = companionClass.getMethod("e", String::class.java, String::class.java),
        )
    } catch (_: Throwable) {
        null
    }
}
