package com.mattermost.securepdfviewer.util

import java.security.MessageDigest

/**
 * Cryptographic hashing utilities for secure PDF viewer operations.
 *
 * This utility object provides secure hashing functions used throughout the PDF viewer
 * for various security and identification purposes. The primary use case is generating
 * secure, consistent identifiers for PDF documents to track password attempt histories
 * without storing sensitive file path information.
 *
 * Key security considerations:
 * - **Consistent Encoding**: Uses UTF-8 encoding to ensure consistent hash results across platforms
 * - **Cryptographic Security**: Employs SHA-256 for cryptographically secure hashing
 * - **Collision Resistance**: SHA-256 provides strong protection against hash collisions
 * - **One-Way Function**: Hash values cannot be reversed to reveal original input
 * - **Deterministic**: Same input always produces the same hash output
 *
 * The generated hashes serve as anonymous identifiers that allow the system to track
 * document-specific state (like password attempts) without storing potentially sensitive
 * file paths in persistent storage.
 */
object HashUtils {

    /**
     * Generates a SHA-256 hash of the input string.
     *
     * This method creates a cryptographically secure hash of the input string using
     * the SHA-256 algorithm. The hash is deterministic (same input produces same output)
     * and provides strong collision resistance, making it suitable for creating unique
     * identifiers for documents based on their file paths.
     *
     * Usage in the PDF viewer:
     * - **Document Identification**: Creates unique keys for password attempt tracking
     * - **Privacy Protection**: Avoids storing actual file paths in persistent storage
     * - **Security**: Prevents reverse engineering of file locations from stored data
     * - **Consistency**: Ensures same document always has same identifier
     *
     * The output is a lowercase hexadecimal string representation of the hash,
     * providing a consistent, readable format for use as storage keys.
     *
     * @param input The string to hash (typically a file path)
     * @return SHA-256 hash as a lowercase hexadecimal string (64 characters)
     */
    fun sha256(input: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val hash = digest.digest(input.toByteArray(Charsets.UTF_8))
        return hash.joinToString("") { "%02x".format(it) }
    }
}
