import Foundation
import Security

class PasswordAttemptStore {
    private let service = "com.mattermost.securepdfviewer.password.attempts"
    private let maxAttempts = 10
    private let restDelay: TimeInterval = 10 * 60

    func getRemainingAttempts(for fileKey: String) -> Int {
        maybeResetIfExperied(for: fileKey)
        let failed = getAttemptInfo(for: fileKey)?.count ?? 0
        return max(maxAttempts - failed, 0)
    }

    func registerFailedAttempt(for fileKey: String) -> Int {
        maybeResetIfExperied(for: fileKey)
        
        var info = getAttemptInfo(for: fileKey) ?? AttemptInfo(count: 0, timestap: nil)
        info.count += 1
        
        if info.count >= maxAttempts {
            info.timestap = Date()
        }
        
        saveAttempts(for: fileKey, info: info)
        return max(maxAttempts - info.count, 0)
    }

    func resetAttempts(for fileKey: String) {
        delete(for: fileKey)
    }

    func hasExceededLimit(for fileKey: String) -> Bool {
        maybeResetIfExperied(for: fileKey)
        return getAttemptInfo(for: fileKey)?.count ?? 0 >= maxAttempts
    }

    var maxAllowedAttempts: Int {
        return maxAttempts
    }

    // MARK: - Private
    
    private struct AttemptInfo: Codable {
        var count: Int
        var timestap: Date?
    }
    
    private func maybeResetIfExperied(for key: String) {
        guard let info = getAttemptInfo(for: key),
              info.count >= maxAttempts,
              let ts = info.timestap else {
            return
        }
        
        if Date().timeIntervalSince(ts) >= restDelay {
            resetAttempts(for: key)
        }
    }
    
    private func getAttemptInfo(for key: String) -> AttemptInfo? {
        guard let data = getData(forKey: key),
              let info = try? JSONDecoder().decode(AttemptInfo.self, from: data) else {
            return nil
        }
        return info
    }

    private func saveAttempts(for key: String, info: AttemptInfo) {
        guard let data = try? JSONEncoder().encode(info) else { return }

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]

        let attributesToUpdate = [kSecValueData as String: data]
        let status = SecItemUpdate(query as CFDictionary, attributesToUpdate as CFDictionary)

        if status == errSecItemNotFound {
            var newItem = query
            newItem[kSecValueData as String] = data
            SecItemAdd(newItem as CFDictionary, nil)
        }
    }

    private func getData(forKey key: String) -> Data? {
        let query = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: service,
            kSecAttrAccount: key,
            kSecReturnData: true,
            kSecMatchLimit: kSecMatchLimitOne
        ] as CFDictionary

        var result: AnyObject?
        let status = SecItemCopyMatching(query, &result)
        return status == errSecSuccess ? result as? Data : nil
    }

    private func delete(for key: String) {
        let query = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: service,
            kSecAttrAccount: key
        ] as CFDictionary

        SecItemDelete(query)
    }
}
