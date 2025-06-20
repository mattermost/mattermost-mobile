import UIKit

extension SecurePdfViewerComponentView {
    public func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldReceive touch: UITouch) -> Bool {
        let location = touch.location(in: pdfView)
        guard let page = pdfView.page(for: location, nearest: true) else { return true }
        let pagePoint = pdfView.convert(location, to: page)

        for annotation in page.annotations where annotation.bounds.contains(pagePoint) {
            if annotation.type == "Link" {
                return false
            }
        }

        return true
    }

    @objc func handleTap(_ sender: UITapGestureRecognizer) {
        guard sender.state == .ended else { return }

        let tapLocation = sender.location(in: pdfView)
        let global = sender.location(in: self.window)
        onTap?([
            "x": tapLocation.x,
            "y": tapLocation.y,
            "pageX": global.x,
            "pageY": global.y,
            "timestamp": Date().timeIntervalSince1970 * 1000,
            "pointerType": "touch"
        ])
        updatePageIndicator()
    }
}
