package com.mattermost.securepdfviewer

import com.facebook.react.viewmanagers.SecurePdfViewerManagerInterface
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.fabric.ViewManagerRegistry
import com.facebook.react.fabric.FabricViewManager

/**
 * View manager for the Secure PDF Viewer component in React Native's new architecture (Fabric).
 * 
 * This class serves as the bridge between React Native's Fabric architecture and the
 * native SecurePdfViewerView component. It extends FabricViewManager to provide enhanced
 * performance and type safety through code generation and improved reconciliation.
 * 
 * New Architecture (Fabric) Benefits:
 * - Static type checking through generated interfaces
 * - Improved performance via C++ implementation
 * - Better synchronization between JavaScript and native layers
 * - Enhanced debugging and error reporting capabilities
 * 
 * Code Generation:
 * The SecurePdfViewerManagerInterface is automatically generated from TypeScript
 * specifications, ensuring type safety and consistency between JavaScript props
 * and native method signatures.
 * 
 * The implementation delegates core functionality to SecurePdfViewerViewManagerImpl
 * to maintain consistency with the legacy architecture implementation, enabling
 * applications to migrate between architectures seamlessly.
 * 
 * Shadow Nodes:
 * Fabric uses shadow nodes to represent the component tree structure in C++,
 * providing better performance and more predictable reconciliation behavior
 * compared to the legacy architecture.
 */
class SecurePdfViewerViewManager :
    FabricViewManager<SecurePdfViewerView, SecurePdfViewerManagerInterface.SecurePdfViewerShadowNode>() {

    // ================================================================================================
    // VIEW MANAGER CORE METHODS
    // ================================================================================================

    /**
     * Returns the name that React Native uses to identify this native component.
     * 
     * In Fabric, this name must match exactly with the component specification
     * defined in the TypeScript/Flow definitions and the generated interface.
     * 
     * @return The component identifier for React Native's Fabric component registry
     */
    override fun getName(): String = SecurePdfViewerViewManagerImpl.getName()

    /**
     * Creates a new instance of the SecurePdfViewerView component.
     * 
     * This method is called by Fabric whenever a new PDF viewer component
     * is rendered in the JavaScript layer. Fabric's reconciliation system
     * manages the lifecycle more efficiently than the legacy architecture.
     * 
     * @param reactContext The themed React Native context providing app-level services
     * @return A new SecurePdfViewerView instance ready for configuration
     */
    override fun createViewInstance(reactContext: ThemedReactContext): SecurePdfViewerView {
        return SecurePdfViewerViewManagerImpl.createViewInstance(reactContext)
    }

    // ================================================================================================
    // FABRIC PROPERTY SETTERS
    // ================================================================================================

    /**
     * Handles the 'source' prop from React Native with Fabric type safety.
     * 
     * In Fabric, this method is called with strong type guarantees based on
     * the generated interface, reducing runtime errors and improving performance.
     * 
     * The prop should contain the absolute file path to the PDF document to be displayed.
     * Fabric's improved reconciliation ensures more predictable update ordering.
     * 
     * @param view The SecurePdfViewerView instance to update
     * @param source The file path to the PDF document, or null to clear
     */
    override fun setSource(view: SecurePdfViewerView, source: String?) {
        SecurePdfViewerViewManagerImpl.setSource(view, source)
    }

    /**
     * Handles the 'password' prop from React Native with Fabric type safety.
     * 
     * Fabric's static type checking ensures that only valid string or null values
     * are passed to this method, eliminating a class of runtime type errors.
     * 
     * @param view The SecurePdfViewerView instance to update
     * @param password The decryption password, or null for unprotected documents
     */
    override fun setPassword(view: SecurePdfViewerView, password: String?) {
        SecurePdfViewerViewManagerImpl.setPassword(view, password)
    }

    /**
     * Handles the 'allowLinks' prop from React Native with Fabric type safety.
     * 
     * Note: The method name 'setAllowLink' (singular) matches the generated interface
     * signature, which may differ from the prop name 'allowLinks' (plural) in JavaScript.
     * This is handled automatically by Fabric's code generation system.
     * 
     * @param view The SecurePdfViewerView instance to update
     * @param allow Whether to enable external link interaction
     */
    override fun setAllowLink(view: SecurePdfViewerView, allow: Boolean) {
        SecurePdfViewerViewManagerImpl.setAllowLink(view, allow)
    }

    // ================================================================================================
    // FABRIC-SPECIFIC METHODS
    // ================================================================================================

    /**
     * Returns the shadow node class used by Fabric for this component.
     * 
     * Shadow nodes represent the component tree structure in C++ and are used
     * by Fabric for efficient layout calculations and reconciliation. The
     * shadow node class is generated automatically from the component specification.
     * 
     * @return The shadow node class for PDF viewer components
     */
    override fun getShadowNodeClass(): Class<SecurePdfViewerManagerInterface.SecurePdfViewerShadowNode> {
        return SecurePdfViewerManagerInterface.SecurePdfViewerShadowNode::class.java
    }

    /**
     * Creates a new shadow node instance for this component.
     * 
     * Shadow nodes are managed by Fabric's C++ layer and provide better performance
     * characteristics compared to the legacy architecture's view management.
     * 
     * @return A new shadow node instance for the PDF viewer component
     */
    override fun createShadowNodeInstance(): SecurePdfViewerManagerInterface.SecurePdfViewerShadowNode {
        return SecurePdfViewerManagerInterface.SecurePdfViewerShadowNode()
    }

    /**
     * Returns the interface class that defines the contract for this view manager.
     * 
     * This interface is generated automatically from TypeScript specifications
     * and ensures type safety and consistency between JavaScript and native code.
     * 
     * @return The generated manager interface class
     */
    override fun getInterface(): Class<SecurePdfViewerManagerInterface<*>> {
        return SecurePdfViewerManagerInterface::class.java as Class<SecurePdfViewerManagerInterface<*>>
    }

    // ================================================================================================
    // EVENT HANDLING
    // ================================================================================================

    /**
     * Note: Event registration in Fabric is handled differently than in the legacy architecture.
     * 
     * Events are defined in the component specification (TypeScript/Flow) and are automatically
     * registered by the code generation system. Unlike the legacy architecture, we don't need
     * to override getExportedCustomBubblingEventTypeConstants() here.
     * 
     * The event system in Fabric provides:
     * - Better type safety for event payloads
     * - Improved performance through C++ event dispatching
     * - More predictable event ordering and timing
     * - Enhanced debugging capabilities
     * 
     * All events defined in the Events enum are automatically available in Fabric
     * through the generated interface and component specification.
     */
}