import Foundation

public protocol SessionAttributesHandling: AnyObject {
    func setEnabled(_ serverUrl: String, enabled: Bool)
    func removeServer(_ serverUrl: String)
    func setManifest(_ serverUrl: String, manifest: [[String: Any]])
    func upsertManifestField(_ serverUrl: String, field: [String: Any])
    func removeManifestField(_ serverUrl: String, name: String)
    func setStableValues(_ values: [String: String])
    func getOutboundHeader(_ serverUrl: String) -> String?
}

@objc public class SessionAttributesBridge: NSObject {
    public static var handler: SessionAttributesHandling?
}
