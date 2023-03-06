import Foundation

extension ImageCache {
    public func image(for userId: String, updatedAt: Double, forServer serverUrl: String) -> Data? {
        lock.lock(); defer { lock.unlock() }
        let key = "\(serverUrl)-\(userId)-\(updatedAt)" as NSString
        if let image = imageCache.object(forKey: key) as? Data {
            return image
        }
        
        return nil
    }
}
