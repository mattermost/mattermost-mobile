import PDFKit

extension SecurePdfViewerComponentView {
    func loadPDF() {
        let filePath = normalizedSource

        guard isValidCachedFile(path: filePath) else {
            onLoadError?(["message": "Invalid file path"])
            return
        }

        let url = URL(fileURLWithPath: filePath)
        if let document = PDFDocument(url: url) {
            pdfDocument = document

            if document.isEncrypted {
                passwordAttempts = 0
                onPasswordRequired!(["maxAttempts": maxPasswordAttempts])
            } else {
                pdfView.document = document
                customThumbnailView.pdfView = pdfView
//                thumbnailView.pdfView = pdfView
//                updateThumbnailSize()
                updatePageIndicator()
                
                if thumbnailLayoutMode == .panel {
//                    thumbnailScrollView.isHidden = false
                    customThumbnailView.isHidden = false
                    layoutIfNeeded()
                }
                
                onLoad?([:])
            }
        } else {
            let error = PDFDiagnostics.diagnoseLoadFailure(at: url)
                    
            // Send specific error information to React Native
            onLoadError?(["message": error.description])
            
            // Log detailed error for debugging
            print("PDF Error: \(error.description) for file at \(filePath)")
        }
    }

    func attemptUnlockIfNeeded() {
        guard let password = password as String?, let document = pdfDocument else {
            return
        }

        if document.unlock(withPassword: password) {
            pdfView.document = document
            customThumbnailView.pdfView = pdfView
//            updateThumbnailSize()
            updatePageIndicator()
            onLoad?([:])
        } else {
            passwordAttempts += 1
            onPasswordFailed?(["remainingAttempts": maxPasswordAttempts - passwordAttempts])
            if passwordAttempts >= maxPasswordAttempts {
                onPasswordFailureLimitReached?([:])
            }
        }
    }
    
    @objc func pageChanged() {
        updatePageIndicator()
    }
    
    @objc func toggleThumbnails() {
        switch thumbnailLayoutMode {
        case .panel:
            // In panel mode, we slide the panel in or out
            let isCurrentlyVisible = thumbnailLeadingConstraint.constant == 0
            
            if isCurrentlyVisible {
                // Hide panel
                thumbnailLeadingConstraint.constant = -thumbnailWidthConstraint.constant
                pdfViewLeadingConstraint.constant = 0
                
                UIView.animate(withDuration: 0.3) {
                    self.customThumbnailView.isHidden = true
                    self.layoutIfNeeded()
                }
            } else {
                // Show panel
                customThumbnailView.isHidden = false
                thumbnailLeadingConstraint.constant = 0
                pdfViewLeadingConstraint.constant = thumbnailWidthConstraint.constant
                
                UIView.animate(withDuration: 0.3) {
                    self.layoutIfNeeded()
                }
            }
            
        case .drawer:
            let isDrawerOpen = thumbnailLeadingConstraint.constant == 0
            thumbnailLeadingConstraint.constant = isDrawerOpen ? -thumbnailWidthConstraint.constant : 0
            pageIndicatorLeadingConstraint.constant = isDrawerOpen ? 16 : thumbnailWidthConstraint.constant + 16
            customThumbnailView.isHidden = isDrawerOpen
            UIView.animate(withDuration: 0.3) {
                self.layoutIfNeeded()
            }
        case .none:
            print("Note: Unsupported thumbnail mode '\(thumbnailLayoutMode)'")
        }
    }

    func updateScrollContentHeight(_ height: CGFloat) {
        // Remove old height constraint if it exists
        if let existingConstraint = thumbnailHeightConstraint {
            existingConstraint.isActive = false
            thumbnailHeightConstraint = nil
        }
        
        // Create and activate new height constraint
        thumbnailHeightConstraint = customThumbnailView.heightAnchor.constraint(equalToConstant: height)
        thumbnailHeightConstraint?.isActive = true
    }

    func updatePageIndicator() {
        guard let doc = pdfView.document, let page = pdfView.currentPage else { return }

        let pageIndex = doc.index(for: page) + 1
        let totalPages = doc.pageCount

        pageIndicator?.updatePage(current: pageIndex, total: totalPages)
        
        pageIndicator?.setAlpha(1)
        hidePageIndicator()
    }
    
    func updatePageIndicatorPosition() {
        if thumbnailLayoutMode == .panel {
            // Keep PageIndicator in a fixed position
            pageIndicatorLeadingConstraint.constant = 16
        } else if thumbnailLayoutMode == .drawer {
            // Align PageIndicator with the drawer
            let isDrawerOpen = thumbnailLeadingConstraint.constant == 0
            pageIndicatorLeadingConstraint.constant = isDrawerOpen ? thumbnailWidthConstraint.constant + 16 : 16
        }

        UIView.animate(withDuration: 0.3) {
            self.layoutIfNeeded()
        }
    }
    
    func hidePageIndicator() {
        hideTimer?.invalidate()
        hideTimer = Timer.scheduledTimer(withTimeInterval: 3, repeats: false) { [weak self] _ in
            UIView.animate(withDuration: 0.3) {
                self?.pageIndicator?.setAlpha(0)
            }
        }
    }
}
