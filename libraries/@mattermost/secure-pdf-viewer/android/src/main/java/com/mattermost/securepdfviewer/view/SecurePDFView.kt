package com.mattermost.securepdfviewer.view

import android.content.Context
import android.view.MotionEvent
import com.github.barteksc.pdfviewer.PDFView

class SecurePDFView(context: Context) : PDFView(context, null) {
    fun wasTapOnLink(event: MotionEvent): Boolean {
        val mappedX = -currentXOffset + event.x
        val mappedY = -currentYOffset + event.y

        val page = pdfFile.getPageAtOffset(if (isSwipeVertical) mappedY else mappedX, zoom)
        val links = pdfFile.getPageLinks(page)
        val pageSize = pdfFile.getScaledPageSize(page, zoom)

        val pageX: Int
        val pageY: Int
        if (isSwipeVertical) {
            pageX = pdfFile.getSecondaryPageOffset(page, zoom).toInt()
            pageY = pdfFile.getPageOffset(page, zoom).toInt()
        } else {
            pageY = pdfFile.getSecondaryPageOffset(page, zoom).toInt()
            pageX = pdfFile.getPageOffset(page, zoom).toInt()
        }

        return links.any { link ->
            val mapped = pdfFile.mapRectToDevice(
                page,
                pageX,
                pageY,
                pageSize.width.toInt(),
                pageSize.height.toInt(),
                link.bounds
            ).apply { sort() }

            mapped.contains(mappedX, mappedY)
        }
    }
}
