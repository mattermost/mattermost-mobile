import Foundation
import CommonCrypto

class HashUtils {
    static func hashOfFilePathOrId(_ input: String) -> String {
        guard let data = input.data(using: .utf8) else { return input }

        var hash = [UInt8](repeating: 0, count: Int(CC_SHA256_DIGEST_LENGTH))
        data.withUnsafeBytes {
            _ = CC_SHA256($0.baseAddress, CC_LONG(data.count), &hash)
        }

        return hash.map { String(format: "%02x", $0) }.joined()
    }
}
