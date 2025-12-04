import UIKit
import PDFKit

class CustomThumbnailCell: UICollectionViewCell {
    static let identifier = "CustomThumbnailCell"

    private let imageView: UIImageView = {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFill
        imageView.translatesAutoresizingMaskIntoConstraints = false
        imageView.layer.cornerRadius = 8
        imageView.clipsToBounds = true
        return imageView
    }()

    private let overlayView: UIView = {
        let overlay = UIView()
        overlay.translatesAutoresizingMaskIntoConstraints = false
        overlay.backgroundColor = UIColor.black.withAlphaComponent(0.3)
        overlay.isHidden = true
        overlay.layer.cornerRadius = 8
        overlay.clipsToBounds = true
        return overlay
    }()

    override init(frame: CGRect) {
        super.init(frame: frame)

        // Add shadow to the cell
        contentView.layer.shadowColor = UIColor.black.cgColor
        contentView.layer.shadowOpacity = 0.2
        contentView.layer.shadowOffset = CGSize(width: 0, height: 2)
        contentView.layer.shadowRadius = 4
        contentView.layer.cornerRadius = 8
        contentView.layer.masksToBounds = false

        contentView.addSubview(imageView)
        contentView.addSubview(overlayView)

        // Add constraints with horizontal padding
        NSLayoutConstraint.activate([
            imageView.topAnchor.constraint(equalTo: contentView.topAnchor),
            imageView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor),
            imageView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 8), // Horizontal padding
            imageView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -8), // Horizontal padding

            // Overlay constraints (match imageView)
            overlayView.topAnchor.constraint(equalTo: imageView.topAnchor),
            overlayView.bottomAnchor.constraint(equalTo: imageView.bottomAnchor),
            overlayView.leadingAnchor.constraint(equalTo: imageView.leadingAnchor),
            overlayView.trailingAnchor.constraint(equalTo: imageView.trailingAnchor)
        ])
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func configure(with page: PDFPage, pdfView: PDFView?, availableWidth: CGFloat, isCurrentPage: Bool) {
        DispatchQueue.global(qos: .userInitiated).async {
            guard let pdfView = pdfView else { return }
            let aspectRatio = page.bounds(for: pdfView.displayBox).size.width / page.bounds(for: pdfView.displayBox).size.height
            let thumbnailHeight = availableWidth / aspectRatio
            let thumbnail = page.thumbnail(of: CGSize(width: availableWidth, height: thumbnailHeight), for: pdfView.displayBox)
            DispatchQueue.main.async {
                self.imageView.image = thumbnail
                self.overlayView.isHidden = !isCurrentPage // Show overlay if this is the current page
            }
        }
    }
}
