package com.mattermost.securepdfviewer

import com.facebook.react.uimanager.ThemedReactContext
import com.mattermost.securepdfviewer.view.SecurePdfViewerView

object SecurePdfViewerViewManagerImpl {

    fun getName(): String = "SecurePdfViewer"

    fun createViewInstance(reactContext: ThemedReactContext): SecurePdfViewerView {
        return SecurePdfViewerView(reactContext)
    }

    fun setSource(view: SecurePdfViewerView, source: String?) {
        view.setSource(source)
    }

    fun setPassword(view: SecurePdfViewerView, password: String?) {
        view.setPassword(password)
    }

    fun setAllowLink(view: SecurePdfViewerView, allow: Boolean) {
        view.setAllowLinks(allow)
    }
}
