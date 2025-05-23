import PDFKit

protocol CustomThumbnailViewDelegate: AnyObject {
    func didSelectThumbnail(for page: PDFPage)
}
