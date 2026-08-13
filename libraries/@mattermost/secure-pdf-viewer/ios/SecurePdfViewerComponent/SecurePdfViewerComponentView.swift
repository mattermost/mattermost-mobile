import Foundation
import PDFKit
import UIKit
import React

@objc(SecurePdfViewerComponentView)
@objcMembers
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
    
    @objc public var source: NSString = "" {
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

    @objc public var password: NSString? {
        didSet {
            if !normalizedSource.isEmpty && password != nil {
                attemptUnlockIfNeeded()
            }
        }
    }

    @objc public var allowLinks: Bool = true

    // Use closures instead of RCTDirectEventBlock to be architecture-agnostic
    // Old architecture (Paper) will set these via RCTDirectEventBlock in the manager
    // New architecture (Fabric) will set these directly from the C++ wrapper
    @objc public var onLinkPressed: (([String: Any]) -> Void)?
    @objc public var onLinkPressedDisabled: (([String: Any]) -> Void)?
    @objc public var onLoad: (([String: Any]) -> Void)?
    @objc public var onPasswordRequired: (([String: Any]) -> Void)?
    @objc public var onPasswordFailed: (([String: Any]) -> Void)?
    @objc public var onPasswordFailureLimitReached: (([String: Any]) -> Void)?
    @objc public var onLoadError: (([String: Any]) -> Void)?
    @objc public var onTap: (([String: Any]) -> Void)?

    @objc public override init(frame: CGRect) {
        super.init(frame: frame)
        setupPDFView()
    }

    @objc public required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupPDFView()
    }

    deinit {
        // Clean up observers and timers to prevent crashes
        contentOffsetObservation?.invalidate()
        hideTimer?.invalidate()
        NotificationCenter.default.removeObserver(self)
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
