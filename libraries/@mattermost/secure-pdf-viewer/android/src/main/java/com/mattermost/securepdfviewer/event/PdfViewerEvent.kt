package com.mattermost.securepdfviewer.event

import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

class PdfViewerEvent(
    val name: String,
    surfaceId: Int,
    viewId: Int,
    private val payload: WritableMap?
) : Event<PdfViewerEvent>(surfaceId, viewId) {
    override fun getEventName() = name
    override fun getEventData() = payload
}
