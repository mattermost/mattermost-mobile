package com.mattermost.helpers.push_notification

import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType

/**
 * Formats an error message from a server response based on the "data" field's type.
 *
 * Each [ReadableType] branch uses the type-safe getter to avoid
 * UnexpectedNativeTypeException from the React Native bridge.
 */
fun formatErrorMessage(response: ReadableMap): String {
    val dataType = if (response.hasKey("data")) response.getType("data") else ReadableType.Null
    return when (dataType) {
        ReadableType.Map -> {
            val error = response.getMap("data")
            if (error != null &&
                error.hasKey("status_code") &&
                error.hasKey("message") &&
                error.getType("status_code") == ReadableType.Number &&
                error.getType("message") == ReadableType.String
            ) {
                "Unexpected code ${error.getInt("status_code")} ${error.getString("message")}"
            } else {
                "Unexpected response: $error"
            }
        }
        ReadableType.String -> "Unexpected response: ${response.getString("data")}"
        ReadableType.Number -> "Unexpected response: ${response.getDouble("data")}"
        ReadableType.Boolean -> "Unexpected response: ${response.getBoolean("data")}"
        ReadableType.Array -> "Unexpected response: ${response.getArray("data")}"
        ReadableType.Null -> "Unexpected response: null"
    }
}
