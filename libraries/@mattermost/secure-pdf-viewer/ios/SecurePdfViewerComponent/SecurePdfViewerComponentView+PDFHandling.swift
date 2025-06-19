import PDFKit

extension SecurePdfViewerComponentView {
    func loadPDF() {
        let filePath = normalizedSource
        let fileKey = HashUtils.hashOfFilePathOrId(filePath)
        
        guard !attemptStore.hasExceededLimit(for: fileKey) else {
            
            onPasswordFailureLimitReached?(["maxAttempts": attemptStore.maxAllowedAttempts])
            return
        }

        guard isValidCachedFile(path: filePath) else {
            onLoadError?(["message": "Invalid file path"])
            return
        }

        let url = URL(fileURLWithPath: filePath)
        if let error = PDFDiagnostics.diagnosePotentialLoadFailure(at: url) {
            onLoadError?(["message": error.description])
            return
        }

        if let document = PDFDocument(url: url) {
            pdfDocument = document

            if document.isEncrypted {
                let passwordAttempts = attemptStore.getRemainingAttempts(for: fileKey)
                onPasswordRequired!(["maxAttempts": attemptStore.maxAllowedAttempts, "remainingAttempts": passwordAttempts])
            } else {
                pdfView.document = document
                customThumbnailView.pdfView = pdfView
                updatePageIndicator()
                
                if thumbnailLayoutMode == .panel {
                    customThumbnailView.isHidden = false
                    layoutIfNeeded()
                }
                
                onLoad?([:])
            }
        } else {
            let error = PDFDiagnostics.diagnoseLoadFailure(at: url)
            onLoadError?(["message": error.description])
        }
    }

    func attemptUnlockIfNeeded() {
        guard let password = password as String?, let document = pdfDocument else {
            return
        }
        
        let fileKey = HashUtils.hashOfFilePathOrId(normalizedSource)

        if document.unlock(withPassword: password) {
            attemptStore.resetAttempts(for: fileKey)
            pdfView.document = document
            customThumbnailView.pdfView = pdfView
            updatePageIndicator()
            onLoad?([:])
        } else {
            let remaining = attemptStore.registerFailedAttempt(for: fileKey)
            if remaining <= 0 {
                onPasswordFailureLimitReached?(["maxAttempts": attemptStore.maxAllowedAttempts])
            } else {
                onPasswordFailed?(["remainingAttempts": remaining])
            }
        }
    }
    
    @objc func pageChanged() {
        updatePageIndicator()
    }
    
    @objc func toggleThumbnails() {
        switch thumbnailLayoutMode {
        case .panel:
            let isCurrentlyVisible = thumbnailLeadingConstraint.constant == 0
            
            if isCurrentlyVisible {
                thumbnailLeadingConstraint.constant = -thumbnailWidthConstraint.constant
                pdfViewLeadingConstraint.constant = 0
                
                UIView.animate(withDuration: 0.3) {
                    self.customThumbnailView.isHidden = true
                    self.layoutIfNeeded()
                }
            } else {
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
        case .none: break // this is to make the switch exhaustive although this one here is not reachable
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
