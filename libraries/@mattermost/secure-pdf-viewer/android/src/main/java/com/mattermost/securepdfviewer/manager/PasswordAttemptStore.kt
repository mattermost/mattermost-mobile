package com.mattermost.securepdfviewer.manager

import android.content.Context
import android.content.SharedPreferences
import androidx.core.content.edit
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys

/**
 * Secure store to track PDF password failure attempts.
 * Encrypted at rest using AndroidX Security library.
 */
class PasswordAttemptStore(context: Context) {

    companion object {
        private const val PREF_NAME = "secure_pdf_attempts"
        private const val MAX_ATTEMPTS = 5
    }

    private val prefs: SharedPreferences by lazy { createEncryptedPrefs(context) }

    fun getRemainingAttempts(fileKey: String): Int {
        val failed = prefs.getInt(fileKey, 0)
        return (MAX_ATTEMPTS - failed).coerceAtLeast(0)
    }

    fun registerFailedAttempt(fileKey: String): Int {
        val updated = prefs.getInt(fileKey, 0) + 1
        prefs.edit() { putInt(fileKey, updated) }
        return (MAX_ATTEMPTS - updated).coerceAtLeast(0)
    }

    fun hasExceededLimit(fileKey: String): Boolean {
        return prefs.getInt(fileKey, 0) >= MAX_ATTEMPTS
    }

    fun resetAttempts(fileKey: String) {
        prefs.edit() { remove(fileKey) }
    }

    fun maxAllowedAttempts(): Int = MAX_ATTEMPTS

    private fun createEncryptedPrefs(context: Context): SharedPreferences {
        val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
        return EncryptedSharedPreferences.create(
            PREF_NAME,
            masterKeyAlias,
            context,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }
}
