import Foundation

protocol ImageCacheType: AnyObject {
    func image(for userId: String, updatedAt: Double, forServer serverUrl: String) -> Data?
    
    func insertImage(_ data: Data?, for userId: String, updatedAt: Double, forServer serverUrl: String )
    
    func removeImage(for userId: String, forServer serverUrl: String)
    
    func removeAllImages()
}
