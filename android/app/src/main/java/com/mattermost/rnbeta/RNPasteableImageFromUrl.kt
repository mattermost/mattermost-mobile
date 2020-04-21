package com.mattermost.rnbeta

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.RCTEventEmitter
import com.facebook.react.views.textinput.ReactEditText
import java.io.IOException
import java.net.URL

class RNPasteableImageFromUrl internal constructor(private val mContext: ReactContext, private val mTarget: ReactEditText, private val mUri: String) : Runnable {
    override fun run() {
        var images: WritableArray? = null
        var error: WritableMap? = null
        try {
            val url = URL(mUri)
            val u = url.openConnection()
            // Get type
            val mimeType = u.getHeaderField("Content-Type")
            if (!mimeType.startsWith("image")) {
                return
            }
            // Get fileSize
            val fileSize = u.getHeaderField("Content-Length").toLong()
            // Get fileName
            val contentDisposition = u.getHeaderField("Content-Disposition")
            val startIndex = contentDisposition.indexOf("filename=\"") + 10
            val endIndex = contentDisposition.length - 1
            val fileName = contentDisposition.substring(startIndex, endIndex)
            val image = Arguments.createMap()
            image.putString("type", mimeType)
            image.putDouble("fileSize", fileSize.toDouble())
            image.putString("fileName", fileName)
            image.putString("uri", mUri)
            images = Arguments.createArray()
            images.pushMap(image)
        } catch (e: IOException) {
            error = Arguments.createMap()
            error.putString("message", e.message)
        }
        val event = Arguments.createMap()
        event.putArray("data", images)
        event.putMap("error", error)
        mContext
                .getJSModule(RCTEventEmitter::class.java)
                .receiveEvent(
                        mTarget.id,
                        "onPaste",
                        event
                )
    }

}
