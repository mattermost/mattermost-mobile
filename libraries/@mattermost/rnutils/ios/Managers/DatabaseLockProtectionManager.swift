import Foundation

/// Owns one `DatabaseActivityAssertion` per caller, keyed by a generated token, so each
/// job's assertion is released independently. Used by both `AppDelegate`'s lifecycle
/// transitions and JS (via RNUtils) around specific long-running DB chains.
public class DatabaseLockProtectionManager: NSObject {
    @objc public static let shared = DatabaseLockProtectionManager()

    private var assertions: [String: DatabaseActivityAssertion] = [:]

    private override init() {}

    /// Returns `nil` if the OS declined to grant a background task. Must be called on the main thread.
    @objc public func begin(_ serverUrl: String, task: String) -> String? {
        dispatchPrecondition(condition: .onQueue(.main))

        let encodedServerUrl = Data(serverUrl.utf8).base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
        let timestampMs = Int(Date().timeIntervalSince1970 * 1000)
        let token = "\(encodedServerUrl)-\(task)-\(timestampMs)"

        let assertion = DatabaseActivityAssertion(name: task)
        guard assertion.isGranted else { return nil }

        assertion.systemDidReleaseAssertion = { [weak self] in
            self?.assertions.removeValue(forKey: token)
        }
        assertions[token] = assertion
        return token
    }

    /// Safe to call with an unknown/already-ended token (no-op). Must be called on the main thread.
    @objc public func end(_ token: String) {
        dispatchPrecondition(condition: .onQueue(.main))

        guard let assertion = assertions.removeValue(forKey: token) else { return }
        assertion.release()
    }
}
