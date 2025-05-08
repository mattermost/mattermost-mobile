import Foundation

extension SecurePdfViewerComponentView {
    /// Validates that the path is either in the app's or app group's cache directory, and is a file
    func isValidCachedFile(path: String) -> Bool {
        var normalizedPath = path

        let fileURL = URL(fileURLWithPath: normalizedPath).standardizedFileURL

        // App's cache directory
        let appCachesURL = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first?.standardizedFileURL

        // Shared app group cache directory
        let groupId = Bundle.main.object(forInfoDictionaryKey: "AppGroupIdentifier") as? String
        let sharedGroupURL = groupId.flatMap {
            FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: $0)?.appendingPathComponent("Library/Caches", isDirectory: true).standardizedFileURL
        }

        let isInAllowedDirectory: Bool = {
            if let appCachesURL = appCachesURL, fileURL.path.hasPrefix(appCachesURL.path) {
                return true
            }
            if let sharedGroupURL = sharedGroupURL, fileURL.path.hasPrefix(sharedGroupURL.path) {
                return true
            }
            return false
        }()

        guard isInAllowedDirectory else {
            return false
        }

        var isDir: ObjCBool = false
        guard FileManager.default.fileExists(atPath: fileURL.path, isDirectory: &isDir), !isDir.boolValue else {
            return false
        }

        return true
    }
}
