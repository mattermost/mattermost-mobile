package com.mattermost.rnbeta

import android.content.ClipboardManager
import android.content.Context
import android.net.Uri
import android.util.Patterns
import android.webkit.MimeTypeMap
import android.webkit.URLUtil
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.RCTEventEmitter
import com.mattermost.share.RealPathUtil
import com.mattermost.share.ShareModule
import java.io.File
import java.io.FileNotFoundException
import java.nio.file.FileAlreadyExistsException
import java.nio.file.Files
import java.nio.file.Paths

class RNPasteableEditTextOnPasteListener internal constructor(private val mEditText: RNPasteableEditText) : com.mattermost.rnbeta.RNEditTextOnPasteListener {
    override fun onPaste(itemUri: Uri?) {
        val reactContext = mEditText.context as ReactContext
        if (itemUri == null) {
            return
        }
        var uri: String = itemUri.toString()
        var images: WritableArray? = null
        var error: WritableMap? = null
        reactContext.contentResolver.getType(itemUri) ?: return
        // Special handle for Google docs
        if (uri == "content://com.google.android.apps.docs.editors.kix.editors.clipboard") {
            val clipboardManager = reactContext.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            val clipData = clipboardManager.primaryClip ?: return
            val item = clipData.getItemAt(0)
            val htmlText = item.htmlText
            // Find uri from html
            val matcher = Patterns.WEB_URL.matcher(htmlText)
            if (matcher.find()) {
                uri = htmlText.substring(matcher.start(1), matcher.end())
            }
        }
        if (uri.startsWith("http")) {
            val pastImageFromUrlThread = Thread(RNPasteableImageFromUrl(reactContext, mEditText, uri))
            pastImageFromUrlThread.start()
            return
        }
        val realUri = RealPathUtil.getRealPathFromURI(reactContext, itemUri)
        if (realUri == null) {
            return
        }
        uri = realUri
        // Get type
        val extension = MimeTypeMap.getFileExtensionFromUrl(uri) ?: return
        val mimeType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension) ?: return
        // Get fileName
        val fileName = URLUtil.guessFileName(uri, null, mimeType)
        if (uri.contains(ShareModule.CACHE_DIR_NAME)) {
            val cacheUri = moveToImagesCache(uri, fileName)
            if (cacheUri == null) {
                return
            }
            uri = cacheUri
        }
        // Get fileSize
        val fileSize: Long
        try {
            val contentResolver = reactContext.contentResolver
            val assetFileDescriptor = contentResolver.openAssetFileDescriptor(itemUri, "r")
                    ?: return
            fileSize = assetFileDescriptor.length
            val image = Arguments.createMap()
            image.putString("type", mimeType)
            image.putDouble("fileSize", fileSize.toDouble())
            image.putString("fileName", fileName)
            image.putString("uri", "file://$uri")
            images = Arguments.createArray()
            images.pushMap(image)
        } catch (e: FileNotFoundException) {
            error = Arguments.createMap()
            error.putString("message", e.message)
        }
        val event = Arguments.createMap()
        event.putArray("data", images)
        event.putMap("error", error)
        reactContext
                .getJSModule(RCTEventEmitter::class.java)
                .receiveEvent(
                        mEditText.id,
                        "onPaste",
                        event
                )
    }

    private fun moveToImagesCache(src: String?, fileName: String): String? {
        val ctx = mEditText.context as ReactContext
        val cacheFolder = ctx.cacheDir.absolutePath + "/Images/"
        val dest = cacheFolder + fileName
        val folder = File(cacheFolder)
        try {
            if (!folder.exists()) {
                folder.mkdirs()
            }
            Files.move(Paths.get(src), Paths.get(dest))
        } catch (fileError: FileAlreadyExistsException) { // Do nothing and return dest path
        } catch (err: Exception) {
            return null
        }
        return dest
    }

}
