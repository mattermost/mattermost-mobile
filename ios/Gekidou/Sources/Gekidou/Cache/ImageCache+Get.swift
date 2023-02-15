import Foundation

extension ImageCache {
    func image(for userId: String, updatedAt: Double, onServer serverUrl: String) -> Data? {
        lock.lock(); defer { lock.unlock() }
        let key = "\(serverUrl)-\(userId)-\(updatedAt)" as NSString
        if let image = imageCache.object(forKey: key) as? Data {
            return image
        }
        
        return nil
    }
}
