package com.mattermost.securepdfviewer

import com.facebook.react.common.MapBuilder
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.SecurePdfViewerManagerDelegate
import com.facebook.react.viewmanagers.SecurePdfViewerManagerInterface
import com.mattermost.securepdfviewer.view.SecurePdfViewerView

@ReactModule(name = "SecurePdfViewer")
class SecurePdfViewerViewManager :
    SimpleViewManager<SecurePdfViewerView>(),
    SecurePdfViewerManagerInterface<SecurePdfViewerView> {

    private val delegate: ViewManagerDelegate<SecurePdfViewerView> = SecurePdfViewerManagerDelegate(this)

    override fun getDelegate(): ViewManagerDelegate<SecurePdfViewerView> = delegate

    override fun getName(): String = SecurePdfViewerViewManagerImpl.getName()

    override fun createViewInstance(reactContext: ThemedReactContext): SecurePdfViewerView {
        return SecurePdfViewerViewManagerImpl.createViewInstance(reactContext)
    }

    @ReactProp(name = "source")
    override fun setSource(view: SecurePdfViewerView, source: String?) {
        SecurePdfViewerViewManagerImpl.setSource(view, source)
    }

    @ReactProp(name = "password")
    override fun setPassword(view: SecurePdfViewerView, password: String?) {
        SecurePdfViewerViewManagerImpl.setPassword(view, password)
    }

    @ReactProp(name = "allowLinks")
    override fun setAllowLinks(view: SecurePdfViewerView, value: Boolean) {
        SecurePdfViewerViewManagerImpl.setAllowLink(view, value)
    }

    override fun getExportedCustomBubblingEventTypeConstants(): MutableMap<String, Any>? {
        val map = super.getExportedCustomBubblingEventTypeConstants() ?: mutableMapOf()

        map["topLinkPressed"] = MapBuilder.of(
            "phasedRegistrationNames",
            MapBuilder.of("bubbled", "onLinkPressed")
        )
        map["topLinkPressedDisabled"] = MapBuilder.of(
            "phasedRegistrationNames",
            MapBuilder.of("bubbled", "onLinkPressedDisabled")
        )
        map["topLoad"] = MapBuilder.of(
            "phasedRegistrationNames",
            MapBuilder.of("bubbled", "onLoad")
        )
        map["topLoadError"] = MapBuilder.of(
            "phasedRegistrationNames",
            MapBuilder.of("bubbled", "onLoadError")
        )
        map["topPasswordRequired"] = MapBuilder.of(
            "phasedRegistrationNames",
            MapBuilder.of("bubbled", "onPasswordRequired")
        )
        map["topPasswordFailed"] = MapBuilder.of(
            "phasedRegistrationNames",
            MapBuilder.of("bubbled", "onPasswordFailed")
        )
        map["topPasswordFailureLimitReached"] = MapBuilder.of(
            "phasedRegistrationNames",
            MapBuilder.of("bubbled", "onPasswordFailureLimitReached")
        )
        map["topTap"] = MapBuilder.of(
            "phasedRegistrationNames",
            MapBuilder.of("bubbled", "onTap")
        )

        return map
    }
}
