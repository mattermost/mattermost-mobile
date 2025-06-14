package com.mattermost.securepdfviewer.event

import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

/**
 * Custom event class for dispatching PDF viewer events to React Native.
 *
 * This class serves as a bridge between the native Android PDF viewer and the React Native
 * event system, enabling seamless communication of user interactions and system state changes
 * from the native layer to the JavaScript application layer.
 *
 * The event system supports React Native's new architecture (Fabric) by properly handling
 * surface IDs and view IDs for event routing.
 *
 * @param name The event name that React Native will receive (must match JavaScript event handler names)
 * @param surfaceId The React Native surface identifier for proper event routing in new architecture
 * @param viewId The specific view instance identifier that generated this event
 * @param payload Optional data payload containing event-specific information (coordinates, URLs, error messages, etc.)
 */
class PdfViewerEvent(
    val name: String,
    surfaceId: Int,
    viewId: Int,
    private val payload: WritableMap?
) : Event<PdfViewerEvent>(surfaceId, viewId) {

    /**
     * Returns the event name for React Native event system routing.
     * This name must match the event handler names defined in the React Native component.
     */
    override fun getEventName() = name

    /**
     * Returns the event payload data that will be passed to React Native event handlers.
     * Contains event-specific information such as coordinates, URLs, error messages, etc.
     */
    override fun getEventData() = payload
}
