package com.mattermost.securepdfviewer.view.emitter

import android.content.Context
import android.view.MotionEvent
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.events.RCTEventEmitter
import com.mattermost.securepdfviewer.BuildConfig
import com.mattermost.securepdfviewer.enums.Events
import com.mattermost.securepdfviewer.event.PdfViewerEvent
import com.mattermost.securepdfviewer.manager.PasswordAttemptStore

/**
 * Handles all React Native event emission for the PDF viewer.
 *
 * This class is responsible for bridging native PDF viewer events to the React Native layer,
 * supporting both legacy and new architecture (Fabric) event dispatch mechanisms.
 *
 * Key responsibilities:
 * - Core event emission with architecture detection
 * - User interaction event emission (taps, links)
 * - Document lifecycle event emission (load, error)
 * - Security event emission (password attempts, failures)
 * - Event payload construction and validation
 */
class PdfEventEmitter(
    private val context: Context,
    private val viewId: Int,
    private val attemptStore: PasswordAttemptStore
) {

    /**
     * Core event emission method that handles both legacy and new React Native architectures.
     *
     * @param name Event name that matches React Native component event handlers
     * @param payload Optional data payload for the event
     */
    private fun emitEvent(name: String, payload: WritableMap?) {
        val reactContext = context as ReactContext

        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
            // New Architecture (Fabric) event dispatch
            val surfaceId = UIManagerHelper.getSurfaceId(reactContext)
            val eventDispatcher = UIManagerHelper.getEventDispatcherForReactTag(reactContext, viewId)

            val event = PdfViewerEvent(name, surfaceId, viewId, payload)
            eventDispatcher?.dispatchEvent(event)
        } else {
            // Legacy Architecture event dispatch
            reactContext.getJSModule(RCTEventEmitter::class.java)
                .receiveEvent(viewId, name, payload)
        }
    }

    /**
     * Emits a tap event with detailed coordinate and pointer information.
     *
     * @param event The motion event containing tap details
     * @param screenLocation Array containing the view's screen coordinates
     */
    fun emitTapEvent(event: MotionEvent, screenLocation: IntArray) {
        emitEvent(Events.ON_TAP.event, Arguments.createMap().apply {
            putDouble("x", event.x.toDouble())
            putDouble("y", event.y.toDouble())
            putDouble("pageX", (screenLocation[0] + event.x).toDouble())
            putDouble("pageY", (screenLocation[1] + event.y).toDouble())
            putDouble("timestamp", event.eventTime.toDouble())

            val pointerType = when (event.getToolType(0)) {
                MotionEvent.TOOL_TYPE_FINGER -> "touch"
                MotionEvent.TOOL_TYPE_STYLUS -> "pen"
                MotionEvent.TOOL_TYPE_MOUSE -> "mouse"
                else -> "unknown"
            }
            putString("pointerType", pointerType)
        })
    }

    /**
     * Emits password requirement event with attempt information.
     *
     * @param fileKey Unique document identifier for attempt tracking
     */
    fun emitPasswordRequired(fileKey: String?) {
        val remaining = fileKey?.let { attemptStore.getRemainingAttempts(it) } ?: 0
        emitEvent(Events.ON_PASSWORD_REQUIRED.event, Arguments.createMap().apply {
            putInt("maxAttempts", attemptStore.maxAllowedAttempts())
            putInt("remainingAttempts", remaining)
        })
    }

    /**
     * Emits password failure event with remaining attempts.
     *
     * @param remainingAttempts Number of password attempts remaining before lockout
     */
    fun emitPasswordFailed(remainingAttempts: Int) {
        emitEvent(Events.ON_PASSWORD_FAILED.event, Arguments.createMap().apply {
            putInt("remainingAttempts", remainingAttempts)
        })
    }

    /**
     * Emits password limit reached event (lockout condition).
     */
    fun emitPasswordFailureLimitReached() {
        emitEvent(Events.ON_PASSWORD_LIMIT_REACHED.event, Arguments.createMap().apply {
            putInt("maxAttempts", attemptStore.maxAllowedAttempts())
        })
    }

    /**
     * Emits document loading failure event.
     *
     * @param message Error message describing the failure
     */
    fun emitLoadFailed(message: String) {
        emitEvent(Events.ON_LOAD_ERROR_EVENT.event, Arguments.createMap().apply {
            putString("message", message)
        })
    }

    /**
     * Emits external link pressed event.
     *
     * @param url The URL of the external link that was tapped
     */
    fun emitLinkPressed(url: String) {
        emitEvent(Events.ON_LINK_PRESSED.event, Arguments.createMap().apply {
            putString("url", url)
        })
    }

    /**
     * Emits event indicating an external link was tapped but link navigation is disabled.
     */
    fun emitLinkPressedDisabled() {
        emitEvent(Events.ON_LINK_PRESSED_DISABLED.event, null)
    }

    /**
     * Emits successful document load completion event.
     */
    fun emitLoadComplete() {
        emitEvent(Events.ON_LOAD_EVENT.event, null)
    }
}
