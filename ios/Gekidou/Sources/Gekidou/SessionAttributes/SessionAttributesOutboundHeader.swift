import Foundation

public typealias SessionAttributesOutboundHeaderHandler = (String) -> String?

@objc public class SessionAttributesOutboundHeader: NSObject {
    @objc public static let headerName = "X-MM-Session-Attributes"

    private static let lock = NSLock()
    private static var handler: SessionAttributesOutboundHeaderHandler?

    public static func setHandler(_ handler: @escaping SessionAttributesOutboundHeaderHandler) {
        lock.lock()
        defer { lock.unlock() }
        self.handler = handler
    }

    @objc public static func getOutboundHeader(_ serverUrl: String) -> String? {
        lock.lock()
        let handler = self.handler
        lock.unlock()
        return handler?(serverUrl)
    }
}
