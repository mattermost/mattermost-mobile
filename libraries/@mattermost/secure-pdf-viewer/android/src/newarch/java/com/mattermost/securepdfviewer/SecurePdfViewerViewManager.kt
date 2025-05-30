package com.mattermost.securepdfviewer

import com.facebook.react.viewmanagers.SecurePdfViewerManagerInterface
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.fabric.ViewManagerRegistry
import com.facebook.react.fabric.FabricViewManager

class SecurePdfViewerViewManager :
    FabricViewManager<SecurePdfViewerView, SecurePdfViewerManagerInterface.SecurePdfViewerShadowNode>() {

    override fun getName(): String = SecurePdfViewerViewManagerImpl.getName()

    override fun createViewInstance(reactContext: ThemedReactContext): SecurePdfViewerView {
        return SecurePdfViewerViewManagerImpl.createViewInstance(reactContext)
    }

    override fun setSource(view: SecurePdfViewerView, source: String?) {
        SecurePdfViewerViewManagerImpl.setSource(view, source)
    }

    override fun setPassword(view: SecurePdfViewerView, password: String?) {
        SecurePdfViewerViewManagerImpl.setPassword(view, password)
    }

    override fun setAllowLink(view: SecurePdfViewerView, allow: Boolean) {
        SecurePdfViewerViewManagerImpl.setAllowLink(view, allow)
    }
}
