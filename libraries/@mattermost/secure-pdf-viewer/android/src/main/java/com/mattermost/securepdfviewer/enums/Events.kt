package com.mattermost.securepdfviewer.enums

/**
 * Enumeration of all events that can be emitted from the PDF viewer to React Native.
 *
 * This enum defines the complete set of events that the native PDF viewer component
 * can emit to the React Native layer, enabling proper communication between the
 * native Android implementation and the JavaScript application layer.
 *
 * Each event represents a specific user interaction or system state change that
 * the React Native side needs to be aware of for proper application flow.
 */
enum class Events(val event: String) {

    // Link interaction events

    /**
     * Emitted when a user taps on an external link within the PDF document.
     * Contains the URL of the tapped link for the application to handle.
     */
    ON_LINK_PRESSED("onLinkPressed"),

    /**
     * Emitted when a user taps on a link but link navigation is disabled.
     * Allows the application to inform users that link navigation is not permitted.
     */
    ON_LINK_PRESSED_DISABLED("onLinkPressedDisabled"),

    // Document loading events

    /**
     * Emitted when a PDF document has been successfully loaded and is ready for display.
     * Indicates that the document is fully initialized and can be interacted with.
     */
    ON_LOAD_EVENT("onLoad"),

    /**
     * Emitted when an error occurs during document loading.
     * Contains error details to help diagnose loading failures.
     */
    ON_LOAD_ERROR_EVENT("onLoadError"),

    // Password authentication events

    /**
     * Emitted when a PDF document requires a password for access.
     * Provides information about remaining password attempts and maximum allowed attempts.
     */
    ON_PASSWORD_REQUIRED("onPasswordRequired"),

    /**
     * Emitted when an incorrect password is provided for a protected document.
     * Includes the number of remaining password attempts before lockout.
     */
    ON_PASSWORD_FAILED("onPasswordFailed"),

    /**
     * Emitted when the maximum number of password attempts has been exceeded.
     * Indicates that the document is now locked and cannot be accessed.
     */
    ON_PASSWORD_LIMIT_REACHED("onPasswordFailureLimitReached"),

    // User interaction events

    /**
     * Emitted when a user taps on the PDF viewer (not on a link).
     * Contains tap coordinates and pointer type information for gesture handling.
     */
    ON_TAP("onTap")
}
