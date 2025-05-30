import UIKit
import PDFKit

class CustomThumbnailView: UIView, UICollectionViewDataSource, UICollectionViewDelegateFlowLayout {
    weak var delegate: CustomThumbnailViewDelegate?

    var pdfView: PDFView? {
        didSet {
            guard let pdfView = pdfView, let document = pdfView.document else {
                thumbnails = []
                collectionView.reloadData()
                return
            }
            loadThumbnails()
        }
    }
    private var thumbnails: [PDFPage] = []
    private let collectionView: UICollectionView
    private var availableWidth: CGFloat = 0

    init(pdfView: PDFView) {
        self.pdfView = pdfView

        // Setup collection view layout
        let layout = UICollectionViewFlowLayout()
        layout.scrollDirection = .vertical
        layout.minimumLineSpacing = 8
        layout.minimumInteritemSpacing = 0
        layout.sectionInset = UIEdgeInsets(top: 8, left: 0, bottom: 8, right: 0)

        // Initialize collection view
        collectionView = UICollectionView(frame: .zero, collectionViewLayout: layout)
        collectionView.translatesAutoresizingMaskIntoConstraints = false
        collectionView.backgroundColor = .systemGray6

        super.init(frame: .zero)

        setupCollectionView()
        loadThumbnails()

        NotificationCenter.default.addObserver(self, selector: #selector(handlePageChanged), name: Notification.Name.PDFViewPageChanged, object: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    deinit {
        NotificationCenter.default.removeObserver(self, name: Notification.Name.PDFViewPageChanged, object: nil)
    }

    private func setupCollectionView() {
        collectionView.dataSource = self
        collectionView.delegate = self
        collectionView.register(CustomThumbnailCell.self, forCellWithReuseIdentifier: CustomThumbnailCell.identifier)
        addSubview(collectionView)

        // Add constraints
        NSLayoutConstraint.activate([
            collectionView.topAnchor.constraint(equalTo: topAnchor),
            collectionView.bottomAnchor.constraint(equalTo: bottomAnchor),
            collectionView.leadingAnchor.constraint(equalTo: leadingAnchor),
            collectionView.trailingAnchor.constraint(equalTo: trailingAnchor)
        ])
    }

    private func loadThumbnails() {
        guard let document = pdfView?.document else { return }
        thumbnails = (0..<document.pageCount).compactMap { document.page(at: $0) }
        collectionView.reloadData()
    }

    func updateLayout(for availableWidth: CGFloat) {
        self.availableWidth = availableWidth
        collectionView.collectionViewLayout.invalidateLayout()
        collectionView.reloadData()
    }

    // MARK: - UICollectionViewDataSource

    func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int {
        return thumbnails.count
    }

    func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
        let cell = collectionView.dequeueReusableCell(withReuseIdentifier: CustomThumbnailCell.identifier, for: indexPath) as! CustomThumbnailCell
        let page = thumbnails[indexPath.item]
        let isCurrentPage = page == pdfView?.currentPage
        cell.configure(with: page, pdfView: pdfView, availableWidth: availableWidth, isCurrentPage: isCurrentPage)
        return cell
    }

    // MARK: - UICollectionViewDelegateFlowLayout

    func collectionView(_ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, sizeForItemAt indexPath: IndexPath) -> CGSize {
        guard let pdfView = pdfView else { return CGSize(width: availableWidth, height: 120) }
        let page = thumbnails[indexPath.item]
        let aspectRatio = page.bounds(for: pdfView.displayBox).size.width / page.bounds(for: pdfView.displayBox).size.height
        let thumbnailWidth = availableWidth // Account for horizontal padding (8 on each side)
        let thumbnailHeight = thumbnailWidth / aspectRatio
        return CGSize(width: thumbnailWidth, height: thumbnailHeight)
    }

    // MARK: - Thumbnail Selection

    func collectionView(_ collectionView: UICollectionView, didSelectItemAt indexPath: IndexPath) {
        let selectedPage = thumbnails[indexPath.item]
        delegate?.didSelectThumbnail(for: selectedPage)
    }

    // MARK: - Page Change Notification
    @objc private func handlePageChanged() {
        collectionView.reloadData() // Reload to update the overlay for the current page
    }
}
