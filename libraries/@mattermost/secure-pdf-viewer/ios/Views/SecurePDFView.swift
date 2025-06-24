import PDFKit
import UIKit

class SecurePDFView: PDFView {
    override init(frame: CGRect) {
        super.init(frame: frame)
        disableLongPressSelection()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        disableLongPressSelection()
    }
    
    private func disableLongPressSelection() {
        let noop = UILongPressGestureRecognizer(target: self, action: #selector(ignoreLongPress(_:)))
        noop.minimumPressDuration = 0.3
        noop.delegate = self
        noop.cancelsTouchesInView = false
        self.addGestureRecognizer(noop)
    }
    
    @objc private func ignoreLongPress(_ gesture: UILongPressGestureRecognizer) {
            // No-op
    }
    
    override var document: PDFDocument? {
        didSet {
            recursivelyDisableSelection(view: self)
        }
    }
    
    func recursivelyDisableSelection(view: UIView) {
        for rec in view.subviews.compactMap({$0.gestureRecognizers}).flatMap({$0}) {
             // UITapAndAHalfRecognizer is for a gesture like "tap first, then tap again and drag", this gesture also enable's text selection
            if rec is UILongPressGestureRecognizer || type(of: rec).description() == "UITapAndAHalfRecognizer" {
                rec.isEnabled = false
            }
        }
        
        // For all subviews, if they do have subview in itself, disable the above 2 gestures as well.
        for view in view.subviews {
            if !view.subviews.isEmpty {
                recursivelyDisableSelection(view: view)
            }
        }
    }
}
