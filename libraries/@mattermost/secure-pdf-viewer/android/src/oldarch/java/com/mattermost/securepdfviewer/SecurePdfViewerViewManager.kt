package com.mattermost.securepdfviewer

import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.mattermost.securepdfviewer.enums.Events
import com.mattermost.securepdfviewer.view.SecurePdfViewerView

class SecurePdfViewerViewManager : SimpleViewManager<SecurePdfViewerView>() {

    override fun getName(): String = SecurePdfViewerViewManagerImpl.getName()

    override fun createViewInstance(reactContext: ThemedReactContext): SecurePdfViewerView {
        return SecurePdfViewerViewManagerImpl.createViewInstance(reactContext)
    }

    override fun getExportedCustomBubblingEventTypeConstants(): MutableMap<String, Any>? {
        val events = mutableMapOf<String, Any>()

        events[Events.ON_LINK_PRESSED.event] = mapOf("phasedRegistrationNames" to mapOf("bubbled" to Events.ON_LINK_PRESSED.event))
        events[Events.ON_LINK_PRESSED_DISABLED.event] = mapOf("phasedRegistrationNames" to mapOf("bubbled" to Events.ON_LINK_PRESSED_DISABLED.event))
        events[Events.ON_LOAD_EVENT.event] = mapOf("phasedRegistrationNames" to mapOf("bubbled" to Events.ON_LOAD_EVENT.event))
        events[Events.ON_LOAD_ERROR_EVENT.event] = mapOf("phasedRegistrationNames" to mapOf("bubbled" to Events.ON_LOAD_ERROR_EVENT.event))
        events[Events.ON_PASSWORD_FAILED.event] = mapOf("phasedRegistrationNames" to mapOf("bubbled" to Events.ON_PASSWORD_FAILED.event))
        events[Events.ON_PASSWORD_REQUIRED.event] = mapOf("phasedRegistrationNames" to mapOf("bubbled" to Events.ON_PASSWORD_REQUIRED.event))
        events[Events.ON_PASSWORD_LIMIT_REACHED.event] = mapOf("phasedRegistrationNames" to mapOf("bubbled" to Events.ON_PASSWORD_LIMIT_REACHED.event))
        events[Events.ON_TAP.event] = mapOf("phasedRegistrationNames" to mapOf("bubbled" to Events.ON_TAP.event))

        return events
    }

    @ReactProp(name = "source")
    fun setSource(view: SecurePdfViewerView, source: String?) {
        SecurePdfViewerViewManagerImpl.setSource(view, source)
    }

    @ReactProp(name = "password")
    fun setPassword(view: SecurePdfViewerView, password: String?) {
        SecurePdfViewerViewManagerImpl.setPassword(view, password)
    }

    @ReactProp(name = "allowLinks")
    fun setAllowLinks(view: SecurePdfViewerView, allow: Boolean) {
        SecurePdfViewerViewManagerImpl.setAllowLink(view, allow)
    }
}
