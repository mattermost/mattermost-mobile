package com.mattermost.securepdfviewer

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.uimanager.ViewManager

/**
 * React Native package definition for the Secure PDF Viewer component.
 *
 * This class serves as the entry point for registering the Secure PDF Viewer
 * with React Native's module system. It implements the ReactPackage interface
 * to provide the framework with information about what native modules and
 * view managers this package contributes to the application.
 *
 * The package follows React Native's standard architecture by separating:
 * - Native Modules: For imperative APIs and background services
 * - View Managers: For declarative UI components that can be rendered in JSX
 *
 * In this implementation, we only provide view managers since the PDF viewer
 * is primarily a UI component that integrates with React Native's declarative
 * rendering system.
 */
class SecurePdfViewerPackage : ReactPackage {

    /**
     * Creates the list of native modules provided by this package.
     *
     * Native modules expose imperative APIs to JavaScript and typically handle
     * background services, device APIs, or complex business logic that doesn't
     * directly relate to UI rendering.
     *
     * For the PDF viewer, all functionality is encapsulated within the view
     * component itself, so no additional native modules are required.
     *
     * @param reactContext The React Native application context
     * @return Empty list since this package only provides UI components
     */
    override fun createNativeModules(reactContext: com.facebook.react.bridge.ReactApplicationContext): List<NativeModule> {
        return emptyList()
    }

    /**
     * Creates the list of view managers provided by this package.
     *
     * View managers are responsible for creating, updating, and managing
     * native UI components that can be used declaratively in React Native JSX.
     * They handle the bridge between React Native's component props and
     * the native Android view system.
     *
     * This package provides the SecurePdfViewerViewManager which manages
     * instances of the SecurePdfViewerView component.
     *
     * @param reactContext The React Native application context
     * @return List containing the PDF viewer view manager
     */
    override fun createViewManagers(reactContext: com.facebook.react.bridge.ReactApplicationContext): List<ViewManager<*, *>> {
        return listOf(SecurePdfViewerViewManager())
    }
}
