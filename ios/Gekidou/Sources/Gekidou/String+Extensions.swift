import Foundation

extension String {
    func removePrefix(_ prefix: String) -> String {
        guard self.hasPrefix(prefix) else { return self }
        return String(self.dropFirst(prefix.count))
    }
    
    func toUrlSafeBase64Encode() -> String {
        return Data(
            self.replacingOccurrences(of: "/\\+/g", with: "-", options: .regularExpression)
                .replacingOccurrences(of: "/\\//g", with: "_", options: .regularExpression)
                .utf8
        ).base64EncodedString()
    }
}
