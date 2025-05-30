import UIKit
import PDFKit

extension SecurePdfViewerComponentView {
    func setupPDFView() {
        pdfView.translatesAutoresizingMaskIntoConstraints = false
        pdfView.autoScales = true
        pdfView.displayMode = .singlePageContinuous
        pdfView.displayDirection = .vertical
        pdfView.displaysPageBreaks = true
        pdfView.usePageViewController(false)
        pdfView.isUserInteractionEnabled = true
        
        if linkDelegate == nil {
            linkDelegate = PDFViewLinkDelegate(owner: self)
        }

        pdfView.delegate = linkDelegate
        
        addSubview(pdfView)
        pdfViewLeadingConstraint = pdfView.leadingAnchor.constraint(equalTo: leadingAnchor)
                
        NSLayoutConstraint.activate([
            pdfView.topAnchor.constraint(equalTo: topAnchor),
            pdfView.bottomAnchor.constraint(equalTo: bottomAnchor),
            pdfViewLeadingConstraint,
            pdfView.trailingAnchor.constraint(equalTo: trailingAnchor)
        ])
        
        setupThumbnailView()
        setupPageIndicator()
        setupObservers()
        
        // Override the tap gesture
        setupGestureOverride()
        
        // show the page indicator on scroll
        setupScrollviewObserver()
        
        setupThumbnailLayout()
    }
    
    private func setupThumbnailView() {
        customThumbnailView = CustomThumbnailView(pdfView: pdfView)
        customThumbnailView.translatesAutoresizingMaskIntoConstraints = false
        customThumbnailView.delegate = self
        addSubview(customThumbnailView)
        
        let defaultPanelWidth: CGFloat = UIDevice.current.userInterfaceIdiom == .pad ? 140 : 100
        
        thumbnailLeadingConstraint = customThumbnailView.leadingAnchor.constraint(equalTo: leadingAnchor)
        thumbnailWidthConstraint = customThumbnailView.widthAnchor.constraint(equalToConstant: defaultPanelWidth)
        thumbnailTopConstraint = customThumbnailView.topAnchor.constraint(equalTo: topAnchor)
        thumbnailBottomConstraint = customThumbnailView.bottomAnchor.constraint(equalTo: bottomAnchor)


        NSLayoutConstraint.activate([            
            thumbnailTopConstraint,
            thumbnailBottomConstraint,
            thumbnailLeadingConstraint,
            thumbnailWidthConstraint,
        ])

        customThumbnailView.updateLayout(for: defaultPanelWidth)
    }
    
    private func setupObservers() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(pageChanged),
            name: Notification.Name.PDFViewPageChanged,
            object: pdfView
        )
        
        // Added orientation change observer
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleOrientationChange),
            name: UIDevice.orientationDidChangeNotification,
            object: nil
        )
    }
    
    private func setupGestureOverride() {
        singleTapRecognizer = UITapGestureRecognizer(target: self, action: #selector(handleTap(_:)))
        singleTapRecognizer.require(toFail: pdfView.gestureRecognizers?.first(where: {
            ($0 as? UITapGestureRecognizer)?.numberOfTapsRequired == 2
        }) ?? UITapGestureRecognizer())
        singleTapRecognizer.delegate = self
        pdfView.addGestureRecognizer(singleTapRecognizer)
    }
    
    private func setupScrollviewObserver() {
        if let scrollView = pdfView.subviews.first(where: { $0 is UIScrollView }) as? UIScrollView {
            contentOffsetObservation = scrollView.observe(\.contentOffset, options: [.new]) { [weak self] scrollView, change in
                if self?.pdfDocument != nil {
                    self?.pageIndicator?.setAlpha(1)
                    self?.hidePageIndicator()
                }
            }
        }
    }
    
    private func setupPageIndicator() {
        pageIndicator = PageIndicatorView(target: self, action: #selector(toggleThumbnails))
        if let pageIndicator = pageIndicator {
            pdfView.addSubview(pageIndicator)
            pageIndicator.translatesAutoresizingMaskIntoConstraints = false
            pageIndicatorLeadingConstraint = pageIndicator.leadingAnchor.constraint(equalTo: pdfView.leadingAnchor, constant: 16) // Default position
            NSLayoutConstraint.activate([
                pageIndicatorLeadingConstraint,
                pageIndicator.topAnchor.constraint(equalTo: pdfView.safeAreaLayoutGuide.topAnchor, constant: 16),
            ])
            pageIndicator.setAlpha(0)
        }
    }
    
    private func setupThumbnailLayout() {
        let availableWidth = bounds.width
        let panelThreshold: CGFloat = UIDevice.current.userInterfaceIdiom == .pad ? 768 : 480
        thumbnailLayoutMode = availableWidth >= panelThreshold ? .panel : .drawer

        if thumbnailLayoutMode == .panel {
            if availableWidth < panelThreshold {
                thumbnailLeadingConstraint.constant = -thumbnailWidthConstraint.constant
                pdfViewLeadingConstraint.constant = 0
            } else {
                // Start with the panel opened
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
                    self.customThumbnailView.isHidden = false
                    self.thumbnailLeadingConstraint.constant = 0
                    self.pdfViewLeadingConstraint.constant = self.thumbnailWidthConstraint.constant
                }
            }
        } else {
            thumbnailLeadingConstraint.constant = -thumbnailWidthConstraint.constant
        }
    }
    
    func layoutThumbnailsBasedOnWidth() {
        let availableWidth = bounds.width
        
        // This prevents unnecessary layout changes that can break visibility
        if abs(lastLayoutWidth - availableWidth) < 1 {
            return
        }
        lastLayoutWidth = availableWidth
        
        let defaultPanelWidth: CGFloat
        let panelThreshold: CGFloat
        
        if UIDevice.current.userInterfaceIdiom == .pad {
            // iPad settings
            defaultPanelWidth = min(max(availableWidth * 0.18, 140), 140)
            panelThreshold = 768
        } else {
            // iPhone settings
            defaultPanelWidth = min(max(availableWidth * 0.25, 100), 140)
            panelThreshold = 480
        }
        
        thumbnailWidthConstraint.constant = defaultPanelWidth
        
        let currentMode = thumbnailLayoutMode
        let shouldBePanelMode = availableWidth >= panelThreshold
        let newMode = shouldBePanelMode ? ThumbnailLayoutMode.panel : ThumbnailLayoutMode.drawer
        
        if currentMode != newMode {
            if shouldBePanelMode {
                switchToPanelMode()
            } else {
                switchToDrawerMode()
            }
            updatePageIndicatorPosition()
        }
        
        setNeedsLayout()
        layoutIfNeeded()

        customThumbnailView?.updateLayout(for: defaultPanelWidth)
    }
    
    private func switchToPanelMode() {
        thumbnailLayoutMode = .panel
        customThumbnailView.isHidden = false
        thumbnailLeadingConstraint.constant = 0
        pdfViewLeadingConstraint.constant = thumbnailWidthConstraint.constant
        
        self.layoutIfNeeded()
    }
        
    private func switchToDrawerMode() {
        thumbnailLayoutMode = .drawer
        thumbnailLeadingConstraint.constant = -thumbnailWidthConstraint.constant
        customThumbnailView.isHidden = true
        pdfViewLeadingConstraint.constant = 0
        
        self.layoutIfNeeded()
    }
    
    @objc func handleOrientationChange() {
        DispatchQueue.main.async {
            self.layoutThumbnailsBasedOnWidth()
            self.updatePageIndicatorPosition()
        }
    }
}
