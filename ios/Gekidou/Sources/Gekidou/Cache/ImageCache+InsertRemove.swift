import Foundation

extension ImageCache {
    public func removeAllImages() {
        imageCache.removeAllObjects()
        keysCache.removeAllObjects()
    }
    
    public func insertImage(_ data: Data?, for userId: String, updatedAt: Double, forServer serverUrl: String ) {
        guard let data = data else {
            return removeImage(for: userId, forServer: serverUrl)
        }
        
        lock.lock(); defer { lock.unlock() }
        let cacheKey = "\(serverUrl)-\(userId)" as NSString
        let imageKey = "\(cacheKey)-\(updatedAt)" as NSString
        imageCache.setObject(NSData(data: data), forKey: imageKey as NSString, cost: data.count)
        keysCache.setObject(imageKey, forKey: cacheKey)
    }
    
    public func removeImage(for userId: String, forServer serverUrl: String) {
        lock.lock(); defer { lock.unlock() }
        let cacheKey = "\(serverUrl)-\(userId)" as NSString
        if let key = keysCache.object(forKey: cacheKey) {
            keysCache.removeObject(forKey: cacheKey)
            imageCache.removeObject(forKey: key)
        }
    }
}
