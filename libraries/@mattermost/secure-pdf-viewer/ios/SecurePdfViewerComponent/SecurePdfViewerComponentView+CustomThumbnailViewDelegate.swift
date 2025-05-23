import PDFKit
import UIKit

extension SecurePdfViewerComponentView: CustomThumbnailViewDelegate {
    func didSelectThumbnail(for page: PDFPage) {
        pdfView.go(to: page)
    }
}
