package com.mattermost.securepdfviewer.view

import android.content.Context
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.util.Log
import android.view.MotionEvent
import android.widget.FrameLayout
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.events.RCTEventEmitter
import com.github.barteksc.pdfviewer.link.LinkHandler
import com.github.barteksc.pdfviewer.util.FitPolicy
import com.mattermost.securepdfviewer.BuildConfig
import com.mattermost.securepdfviewer.enums.Events
import com.mattermost.securepdfviewer.event.PdfViewerEvent
import com.mattermost.securepdfviewer.util.FileValidator
import com.mattermost.securepdfviewer.util.MemoryUtil
import java.util.Locale

class SecurePdfViewerView(context: Context) : FrameLayout(context) {
    private val TAG = "SecurePdfViewerView"
    private val pdfView: SecurePDFView = SecurePDFView(context)

    private var source: String? = null
    private var password: String? = null
    private var allowLinks: Boolean = false
    private var retryAttempts = 0
    private val maxRetryAttempts = 5

    private val customLinkHandler = LinkHandler { event ->
        val uri = event?.link?.uri
        val page = event?.link?.destPageIdx
        if (!uri.isNullOrEmpty()) {
            when {
                allowLinks -> {
                    emitLinkPressed(uri)
                }
                else -> {
                    emitLinkPressedDisabled()
                }
            }
        } else if (page != null) {
            pdfView.jumpTo(page)
        }
    }

    init {
        addView(pdfView)
    }

    fun setSource(path: String?) {
        source = path
        maybeLoadPdf()
    }

    fun setPassword(pass: String?) {
        password = pass
        if (source != null && pass != null) {
            maybeLoadPdf()
        }
    }

    fun setAllowLinks(allow: Boolean) {
        allowLinks = allow
    }

    private fun maybeLoadPdf() {
        val allowedDirs = listOfNotNull(context.cacheDir, context.externalCacheDir)
        val file = FileValidator.parseSourceToFile(source, allowedDirs)
        if (file == null) {
            emitLoadFailed("Invalid or unauthorized file")
            return
        }

        val fileSize = FileValidator.getSafeFileSize(file)
        val maxSize = MemoryUtil.getMaxPdfSize(context)
        if (fileSize == null) {
            emitLoadFailed("Unable to read file size")
            return
        }
        if (fileSize > maxSize) {
            val sizeInMB = fileSize / (1024.0 * 1024.0)
            val limitInMB = maxSize / (1024.0 * 1024.0)
            val error = String.format(
                Locale.US,
                "The PDF file is too large to process: %.1f MB. Maximum supported size is %.0f MB.",
                sizeInMB,
                limitInMB
            )
            emitLoadFailed(error)
            return
        }

        val bgColor = (this.background as? ColorDrawable)?.color ?: Color.LTGRAY
        pdfView.setBackgroundColor(bgColor)

        pdfView.fromFile(file)
            .enableSwipe(true)
            .swipeHorizontal(false)
            .enableDoubletap(true)
            .enableAnnotationRendering(false)
            .enableAntialiasing(true)
            .password(password)
            .spacing(3)
            .autoSpacing(false)
            .pageFitPolicy(FitPolicy.WIDTH)
            .pageSnap(false)
            .pageFling(false)
            .nightMode(false)
            .linkHandler(customLinkHandler)
            .onError { throwable ->
                Log.e(TAG, "PDF load error", throwable)
                handleLoadError(throwable)
            }
            .onLoad {
                resetRetries()
                emitEvent(Events.ON_LOAD_EVENT.event, null)
            }
            .onTap { event ->
                if (!pdfView.wasTapOnLink(event)) {
                    val screenLocation = IntArray(2)
                    getLocationOnScreen(screenLocation)
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
                false
            }
            .scrollHandle(ImprovedScrollHandle(context))
            .load()
    }

    private fun handleLoadError(throwable: Throwable) {
        val message = throwable.message ?: ""

        if (message.contains("password", ignoreCase = true)) {
            if (retryAttempts == 0 && password == null) {
                emitPasswordRequired()
                return
            }
            retryAttempts++
            if (retryAttempts < maxRetryAttempts) {
                emitPasswordFailed()
            } else {
                emitPasswordFailureLimitReached()
            }
        } else {
            emitLoadFailed(message)
        }
    }

    private fun resetRetries() {
        retryAttempts = 0
    }

    private fun emitEvent(name: String, payload: WritableMap?) {
        val reactContext = context as ReactContext

        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
            val surfaceId = UIManagerHelper.getSurfaceId(reactContext)
            val eventDispatcher = UIManagerHelper.getEventDispatcherForReactTag(reactContext, id)

            val event = PdfViewerEvent(name, surfaceId, id, payload)
            eventDispatcher?.dispatchEvent(event)
        } else {
            reactContext.getJSModule(RCTEventEmitter::class.java)
                .receiveEvent(id, name, payload)
        }
    }

    private fun emitPasswordRequired() {
        emitEvent(Events.ON_PASSWORD_REQUIRED.event, Arguments.createMap().apply {
            putInt("maxAttempts", maxRetryAttempts)
        })
    }

    private fun emitPasswordFailed() {
        emitEvent(Events.ON_PASSWORD_FAILED.event, Arguments.createMap().apply {
            putInt("remainingAttempts", maxRetryAttempts - retryAttempts)
        })
    }

    private fun emitPasswordFailureLimitReached() {
        emitEvent(Events.ON_PASSWORD_LIMIT_REACHED.event, null)
    }

    private fun emitLoadFailed(message: String) {
        emitEvent(Events.ON_LOAD_ERROR_EVENT.event, Arguments.createMap().apply {
            putString("message", message)
        })
    }

    private fun emitLinkPressed(url: String) {
        emitEvent(Events.ON_LINK_PRESSED.event, Arguments.createMap().apply {
            putString("url", url)
        })
    }

    private fun emitLinkPressedDisabled() {
        emitEvent(Events.ON_LINK_PRESSED_DISABLED.event, null)
    }
}
