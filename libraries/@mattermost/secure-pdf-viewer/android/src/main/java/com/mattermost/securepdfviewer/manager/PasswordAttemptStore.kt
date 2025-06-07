package com.mattermost.securepdfviewer.manager

import android.content.Context
import android.content.SharedPreferences
import androidx.core.content.edit
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys

/**
 * Secure manager for tracking PDF password authentication failures per document.
 *
 * This class provides a secure, encrypted storage mechanism for tracking failed password
 * attempts on protected PDF documents. It implements a security measure to prevent
 * brute force attacks by limiting the number of password attempts allowed per document.
 *
 * Key security features:
 * - All data is encrypted at rest using AndroidX Security library
 * - Uses AES-256 encryption with hardware-backed keys when available
 * - Tracks attempts per unique document identifier (file hash)
 * - Implements automatic lockout after maximum attempts exceeded
 * - Provides secure cleanup of attempt history on successful authentication
 *
 * The store uses the document's SHA-256 hash as the unique identifier, ensuring
 * that attempt tracking is tied to specific documents rather than file paths
 * which could be manipulated.
 */
class PasswordAttemptStore(context: Context) {

    companion object {
        private const val PREF_NAME = "secure_pdf_attempts"
        private const val MAX_ATTEMPTS = 10
        private const val RESET_DELAY_MILLIS = 10 * 60 * 1000L
        private const val TIMESTAMP_SUFFIX = "_ts"
    }

    // Lazy initialization of encrypted preferences to avoid blocking the main thread
    private val prefs: SharedPreferences by lazy { createEncryptedPrefs(context) }

    // Attempt tracking operations

    /**
     * Gets the number of remaining password attempts for a specific document.
     *
     * @param fileKey Unique identifier for the document (typically SHA-256 hash of file path)
     * @return Number of attempts remaining before lockout (0 if already locked out)
     */
    fun getRemainingAttempts(fileKey: String): Int {
        maybeResetIfExpired(fileKey)

        val failed = prefs.getInt(fileKey, 0)
        return (MAX_ATTEMPTS - failed).coerceAtLeast(0)
    }

    /**
     * Registers a failed password attempt for a document and returns remaining attempts.
     *
     * @param fileKey Unique identifier for the document
     * @return Number of attempts remaining after this failure (0 if now locked out)
     */
    fun registerFailedAttempt(fileKey: String): Int {
        maybeResetIfExpired(fileKey)

        val current = prefs.getInt(fileKey, 0) + 1
        prefs.edit {
            putInt(fileKey, current)
            if (current >= MAX_ATTEMPTS) {
                putLong(fileKey + TIMESTAMP_SUFFIX, System.currentTimeMillis())
            }
        }
        return (MAX_ATTEMPTS - current).coerceAtLeast(0)
    }

    /**
     * Checks if a document has exceeded the maximum allowed password attempts.
     *
     * @param fileKey Unique identifier for the document
     * @return true if the document is locked out due to too many failed attempts
     */
    fun hasExceededLimit(fileKey: String): Boolean {
        maybeResetIfExpired(fileKey)
        return prefs.getInt(fileKey, 0) >= MAX_ATTEMPTS
    }

    /**
     * Resets the failed attempt counter for a document.
     * Called when a correct password is provided to clear the attempt history.
     *
     * @param fileKey Unique identifier for the document
     */
    fun resetAttempts(fileKey: String) {
        prefs.edit {
            remove(fileKey)
            remove(fileKey + TIMESTAMP_SUFFIX)
        }
    }

    /**
     * Returns the maximum number of password attempts allowed per document.
     *
     * @return Maximum allowed attempts before lockout
     */
    fun maxAllowedAttempts(): Int = MAX_ATTEMPTS

    // Private encryption setup

    private fun maybeResetIfExpired(fileKey: String) {
        val timestamp = prefs.getLong(fileKey + TIMESTAMP_SUFFIX, -1L)
        if (timestamp <= 0) return

        val now = System.currentTimeMillis()
        if (now - timestamp >= RESET_DELAY_MILLIS) {
            resetAttempts(fileKey)
        }
    }

    /**
     * Creates encrypted SharedPreferences instance with strong encryption.
     *
     * Uses AndroidX Security library to provide:
     * - AES-256 encryption for both keys and values
     * - Hardware-backed master keys when available
     * - Automatic key rotation and management
     *
     * @param context Application context for accessing encryption services
     * @return Encrypted SharedPreferences instance
     */
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
