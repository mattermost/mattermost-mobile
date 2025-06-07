package com.mattermost.securepdfviewer

import com.facebook.react.uimanager.ThemedReactContext
import com.mattermost.securepdfviewer.view.SecurePdfViewerView

/**
 * Implementation object for the Secure PDF Viewer view manager.
 *
 * This object contains the core implementation logic for managing SecurePdfViewerView
 * instances that is shared between the legacy React Native architecture and the new
 * architecture (Fabric). By centralizing the implementation here, we ensure consistent
 * behavior across both architectures while allowing each to have its own specific
 * view manager wrapper.
 *
 * Architecture compatibility:
 * - Legacy Architecture: Uses ViewGroupManager with manual property setting
 * - New Architecture (Fabric): Uses ViewManager with generated interfaces
 *
 * This pattern follows React Native's recommended approach for supporting both
 * architectures during the transition period, allowing applications to migrate
 * to Fabric at their own pace while maintaining full functionality.
 */
object SecurePdfViewerViewManagerImpl {

    // ================================================================================================
    // COMPONENT IDENTIFICATION
    // ================================================================================================

    /**
     * Returns the name that React Native will use to identify this component.
     *
     * This name must match the component name used in JavaScript/TypeScript code
     * when importing or referencing the native component. It serves as the bridge
     * identifier between the JavaScript layer and the native Android implementation.
     *
     * @return The component name as it appears in React Native
     */
    fun getName(): String = "SecurePdfViewer"

    // ================================================================================================
    // VIEW LIFECYCLE MANAGEMENT
    // ================================================================================================

    /**
     * Creates a new instance of the SecurePdfViewerView component.
     *
     * This method is called by React Native whenever a new instance of the PDF viewer
     * component is rendered in the JavaScript layer. Each instance is independent and
     * maintains its own state for document loading, scroll position, zoom level, etc.
     *
     * The ThemedReactContext provides access to React Native's theming system and
     * application context, allowing the component to integrate properly with the
     * overall application environment.
     *
     * @param reactContext The themed React Native context for this view instance
     * @return A new SecurePdfViewerView instance ready for configuration and rendering
     */
    fun createViewInstance(reactContext: ThemedReactContext): SecurePdfViewerView {
        return SecurePdfViewerView(reactContext)
    }

    // ================================================================================================
    // PROPERTY SETTERS
    // ================================================================================================

    /**
     * Sets the source file path for the PDF document to be displayed.
     *
     * This method handles the 'source' prop from React Native, which should contain
     * the absolute file path to a PDF document. The path must point to a file within
     * the application's allowed directories (cache directories) for security reasons.
     *
     * Setting the source will trigger document validation and loading if all required
     * parameters (source, password if needed) are available.
     *
     * @param view The SecurePdfViewerView instance to update
     * @param source The absolute file path to the PDF document, or null to clear
     */
    fun setSource(view: SecurePdfViewerView, source: String?) {
        view.setSource(source)
    }

    /**
     * Sets the password for encrypted PDF documents.
     *
     * This method handles the 'password' prop from React Native. The password is used
     * to authenticate and decrypt password-protected PDF documents. If a document
     * requires a password but none is provided, the component will emit a password
     * required event to the JavaScript layer.
     *
     * Password attempts are tracked and limited to prevent brute force attacks on
     * encrypted documents. After exceeding the attempt limit, the document will be
     * locked out for security.
     *
     * @param view The SecurePdfViewerView instance to update
     * @param password The decryption password for the PDF document, or null for unprotected documents
     */
    fun setPassword(view: SecurePdfViewerView, password: String?) {
        view.setPassword(password)
    }

    /**
     * Configures whether external links within the PDF should be interactive.
     *
     * This method handles the 'allowLinks' prop from React Native. When enabled,
     * tapping on external links (URLs) within the PDF will emit link pressed events
     * to the JavaScript layer, allowing the application to handle link navigation.
     * When disabled, link taps will emit "link disabled" events instead.
     *
     * Internal links (page references within the same document) are always enabled
     * and handled automatically by the PDF viewer for document navigation.
     *
     * Security consideration: Disabling external links can prevent potentially
     * malicious PDF documents from redirecting users to harmful websites.
     *
     * @param view The SecurePdfViewerView instance to update
     * @param allow Whether to enable external link interaction (true) or disable it (false)
     */
    fun setAllowLink(view: SecurePdfViewerView, allow: Boolean) {
        view.setAllowLinks(allow)
    }
}
