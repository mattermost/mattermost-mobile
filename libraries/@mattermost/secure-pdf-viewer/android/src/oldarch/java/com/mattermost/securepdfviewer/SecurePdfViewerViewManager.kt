package com.mattermost.securepdfviewer

import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.mattermost.securepdfviewer.enums.Events
import com.mattermost.securepdfviewer.view.SecurePdfViewerView

/**
 * View manager for the Secure PDF Viewer component in React Native's legacy architecture.
 *
 * This class serves as the bridge between React Native's legacy architecture and the
 * native SecurePdfViewerView component. It extends SimpleViewManager to handle view
 * creation, property updates, and event registration for the PDF viewer component.
 *
 * Legacy Architecture Responsibilities:
 * - Managing view lifecycle (creation, updates, destruction)
 * - Registering React props and their corresponding native setters
 * - Defining event types that can be emitted to JavaScript
 * - Handling property validation and type conversion
 *
 * The implementation delegates core functionality to SecurePdfViewerViewManagerImpl
 * to maintain consistency with the new architecture (Fabric) implementation.
 *
 * Event System:
 * All events are configured as "bubbling" events, meaning they propagate up through
 * the React component tree, allowing parent components to handle them via standard
 * React event handling patterns.
 */
class SecurePdfViewerViewManager : SimpleViewManager<SecurePdfViewerView>() {

    // ================================================================================================
    // VIEW MANAGER CORE METHODS
    // ================================================================================================

    /**
     * Returns the name that React Native uses to identify this native component.
     *
     * This name must match exactly with the component name used in JavaScript
     * when referencing the native component (e.g., in requireNativeComponent).
     *
     * @return The component identifier for React Native's component registry
     */
    override fun getName(): String = SecurePdfViewerViewManagerImpl.getName()

    /**
     * Creates a new instance of the SecurePdfViewerView component.
     *
     * This method is called by React Native whenever a new PDF viewer component
     * is rendered in the JavaScript layer. The created view will be configured
     * with props and added to the native view hierarchy.
     *
     * @param reactContext The themed React Native context providing app-level services
     * @return A new SecurePdfViewerView instance ready for configuration
     */
    override fun createViewInstance(reactContext: ThemedReactContext): SecurePdfViewerView {
        return SecurePdfViewerViewManagerImpl.createViewInstance(reactContext)
    }

    // ================================================================================================
    // EVENT SYSTEM CONFIGURATION
    // ================================================================================================

    /**
     * Defines the custom bubbling events that this component can emit to React Native.
     *
     * This method registers all the events that the PDF viewer can emit, making them
     * available for handling in React Native components through standard event props
     * (onLinkPressed, onLoad, onTap, etc.).
     *
     * Bubbling Events:
     * Events propagate up through the React component tree, allowing parent components
     * to handle them. This is the standard pattern for most React Native events.
     *
     * Event Registration Structure:
     * Each event maps to a "phasedRegistrationNames" object that defines how the event
     * should be handled during React's event propagation phases.
     *
     * @return Map of event names to their registration configuration
     */
    override fun getExportedCustomBubblingEventTypeConstants(): MutableMap<String, Any>? {
        val events = mutableMapOf<String, Any>()

        // Link interaction events
        events[Events.ON_LINK_PRESSED.event] = mapOf(
            "phasedRegistrationNames" to mapOf("bubbled" to Events.ON_LINK_PRESSED.event)
        )
        events[Events.ON_LINK_PRESSED_DISABLED.event] = mapOf(
            "phasedRegistrationNames" to mapOf("bubbled" to Events.ON_LINK_PRESSED_DISABLED.event)
        )

        // Document lifecycle events
        events[Events.ON_LOAD_EVENT.event] = mapOf(
            "phasedRegistrationNames" to mapOf("bubbled" to Events.ON_LOAD_EVENT.event)
        )
        events[Events.ON_LOAD_ERROR_EVENT.event] = mapOf(
            "phasedRegistrationNames" to mapOf("bubbled" to Events.ON_LOAD_ERROR_EVENT.event)
        )

        // Password authentication events
        events[Events.ON_PASSWORD_FAILED.event] = mapOf(
            "phasedRegistrationNames" to mapOf("bubbled" to Events.ON_PASSWORD_FAILED.event)
        )
        events[Events.ON_PASSWORD_REQUIRED.event] = mapOf(
            "phasedRegistrationNames" to mapOf("bubbled" to Events.ON_PASSWORD_REQUIRED.event)
        )
        events[Events.ON_PASSWORD_LIMIT_REACHED.event] = mapOf(
            "phasedRegistrationNames" to mapOf("bubbled" to Events.ON_PASSWORD_LIMIT_REACHED.event)
        )

        // User interaction events
        events[Events.ON_TAP.event] = mapOf(
            "phasedRegistrationNames" to mapOf("bubbled" to Events.ON_TAP.event)
        )

        return events
    }

    // ================================================================================================
    // REACT PROP HANDLERS
    // ================================================================================================

    /**
     * Handles the 'source' prop from React Native.
     *
     * This prop should contain the absolute file path to the PDF document to be displayed.
     * The path must point to a file within the application's allowed directories for security.
     *
     * Property Behavior:
     * - Setting a valid path triggers document loading
     * - Setting null clears the current document
     * - Invalid paths will result in load error events
     *
     * @param view The SecurePdfViewerView instance to update
     * @param source The file path to the PDF document, or null to clear
     */
    @ReactProp(name = "source")
    fun setSource(view: SecurePdfViewerView, source: String?) {
        SecurePdfViewerViewManagerImpl.setSource(view, source)
    }

    /**
     * Handles the 'password' prop from React Native.
     *
     * This prop provides the password for encrypted PDF documents. Password attempts
     * are tracked and limited for security. Failed attempts will trigger appropriate
     * error events to inform the JavaScript layer.
     *
     * Property Behavior:
     * - Setting a password triggers authentication if a document is loaded
     * - Setting null indicates the document should be unprotected
     * - Incorrect passwords will result in password failed events
     *
     * @param view The SecurePdfViewerView instance to update
     * @param password The decryption password, or null for unprotected documents
     */
    @ReactProp(name = "password")
    fun setPassword(view: SecurePdfViewerView, password: String?) {
        SecurePdfViewerViewManagerImpl.setPassword(view, password)
    }

    /**
     * Handles the 'allowLinks' prop from React Native.
     *
     * This prop controls whether external links within the PDF document should be
     * interactive. When enabled, external link taps emit events for JavaScript handling.
     * When disabled, link taps emit "disabled" events instead.
     *
     * Property Behavior:
     * - true: External links emit "onLinkPressed" events with URLs
     * - false: External links emit "onLinkPressedDisabled" events
     * - Internal links (page navigation) are always enabled
     *
     * Security Note:
     * Disabling external links can prevent potentially malicious PDFs from
     * redirecting users to harmful websites.
     *
     * @param view The SecurePdfViewerView instance to update
     * @param allow Whether to enable external link interaction
     */
    @ReactProp(name = "allowLinks")
    fun setAllowLinks(view: SecurePdfViewerView, allow: Boolean) {
        SecurePdfViewerViewManagerImpl.setAllowLink(view, allow)
    }
}
