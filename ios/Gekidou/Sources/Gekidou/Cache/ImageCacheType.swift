import Foundation

protocol ImageCacheType: class {
    func image(for userId: String, updatedAt: Double, onServer serverUrl: String) -> Data?
    
    func insertImage(_ data: Data?, for userId: String, updatedAt: Double, onServer serverUrl: String )
    
    func removeImage(for userId: String, onServer serverUrl: String)
    
    func removeAllImages()
}
