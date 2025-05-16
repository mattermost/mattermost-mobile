import Foundation
import Security

class PasswordAttemptStore {
    private let service = "com.mattermost.securepdfviewer.password.attempts"
    private let maxAttempts = 5

    func getRemainingAttempts(for fileKey: String) -> Int {
        let failed = getFailedAttempts(for: fileKey)
        return max(maxAttempts - failed, 0)
    }

    func registerFailedAttempt(for fileKey: String) -> Int {
        let failed = getFailedAttempts(for: fileKey) + 1
        saveAttempts(for: fileKey, count: failed)
        return max(maxAttempts - failed, 0)
    }

    func resetAttempts(for fileKey: String) {
        delete(for: fileKey)
    }

    func hasExceededLimit(for fileKey: String) -> Bool {
        return getFailedAttempts(for: fileKey) >= maxAttempts
    }

    var maxAllowedAttempts: Int {
        return maxAttempts
    }

    // MARK: - Private

    private func getFailedAttempts(for key: String) -> Int {
        guard let data = getData(forKey: key),
              let count = try? JSONDecoder().decode(Int.self, from: data) else {
            return 0
        }
        return count
    }

    private func saveAttempts(for key: String, count: Int) {
        guard let data = try? JSONEncoder().encode(count) else { return }

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
