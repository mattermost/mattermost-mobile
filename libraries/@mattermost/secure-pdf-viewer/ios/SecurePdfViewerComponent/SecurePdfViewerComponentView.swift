import Foundation
import PDFKit
import UIKit

@objc(SecurePdfViewerComponentView)
public class SecurePdfViewerComponentView: UIView, UIGestureRecognizerDelegate {
    let attemptStore = PasswordAttemptStore()
    let pdfView = SecurePDFView()
    var pdfDocument: PDFDocument?
    var linkDelegate: PDFViewLinkDelegate?
    var normalizedSource: String = ""
    var pageIndicator: PageIndicatorView?
    
    var lastLayoutWidth: CGFloat = 0
    var thumbnailLayoutMode: ThumbnailLayoutMode!
    var customThumbnailView: CustomThumbnailView!
    var thumbnailLeadingConstraint: NSLayoutConstraint!
    var thumbnailWidthConstraint: NSLayoutConstraint!
    var thumbnailHeightConstraint: NSLayoutConstraint?
    var thumbnailTopConstraint: NSLayoutConstraint!
    var thumbnailBottomConstraint: NSLayoutConstraint!
    var pdfViewLeadingConstraint: NSLayoutConstraint!
    var pageIndicatorLeadingConstraint: NSLayoutConstraint!
    
    // Enum for thumbnail display mode
    enum ThumbnailLayoutMode {
        case panel  // Side by side with PDF (iPad/wide screens)
        case drawer // Slides over the PDF (iPhone/narrow screens)
    }

    // UI interaction properties
    var contentOffsetObservation: NSKeyValueObservation?
    var singleTapRecognizer: UITapGestureRecognizer!
    var doubleTapRecognizer: UITapGestureRecognizer!
    var hideTimer: Timer?
    
    @objc var source: NSString = "" {
        didSet {
            let rawPath = source as String
            if rawPath.hasPrefix("file://"), let url = URL(string: rawPath), url.isFileURL {
                normalizedSource = url.path
            } else {
                normalizedSource = rawPath
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                self.loadPDF()
            }
        }
    }

    @objc var password: NSString? {
        didSet {
            if !normalizedSource.isEmpty && password != nil {
                attemptUnlockIfNeeded()
            }
        }
    }

    @objc var allowLinks: Bool = true
    @objc var onLinkPressed: RCTDirectEventBlock?
    @objc var onLinkPressedDisabled: RCTDirectEventBlock?
    @objc var onLoad: RCTDirectEventBlock?
    @objc var onPasswordRequired: RCTDirectEventBlock?
    @objc var onPasswordFailed: RCTDirectEventBlock?
    @objc var onPasswordFailureLimitReached: RCTDirectEventBlock?
    @objc var onLoadError: RCTDirectEventBlock?
    @objc var onTap: RCTDirectEventBlock?

    @objc public override init(frame: CGRect) {
        super.init(frame: frame)
        setupPDFView()
    }

    @objc public required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupPDFView()
    }
    
    public override func layoutSubviews() {
        super.layoutSubviews()
        
        // Check if we need to change layout mode when the view resizes
        layoutThumbnailsBasedOnWidth()
    }
}

class PDFViewLinkDelegate: NSObject, PDFViewDelegate {
    weak var owner: SecurePdfViewerComponentView?
    
    init(owner: SecurePdfViewerComponentView?) {
        self.owner = owner
    }
    
    @objc func pdfViewWillClick(onLink sender: PDFView, with url: URL) {
        guard let owner = owner else { return }
       
        if owner.allowLinks {
            owner.onLinkPressed?(["url": url.absoluteString])
        } else {
            owner.onLinkPressedDisabled?([:])
        }
    }
}
