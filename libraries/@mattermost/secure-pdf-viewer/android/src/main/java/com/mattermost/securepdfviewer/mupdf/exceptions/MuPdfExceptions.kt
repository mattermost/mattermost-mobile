package com.mattermost.securepdfviewer.mupdf.exceptions

/**
 * Exception thrown when a document requires a password but none was provided.
 */
class PasswordRequiredException(message: String) : Exception(message)

/**
 * Exception thrown when an invalid password is provided.
 */
class InvalidPasswordException(message: String) : Exception(message)

/**
 * Exception thrown when a document cannot be opened for various reasons.
 */
class DocumentOpenException(message: String, cause: Throwable? = null) : Exception(message, cause)
