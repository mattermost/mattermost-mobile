import Foundation

public final class ImageCache: ImageCacheType {
    public static let `default` = ImageCache()
    struct Config {
        let countLimit: Int
        let memoryLimit: Int
        
        static let defaultConfig = Config(countLimit: 50, memoryLimit: 1024 * 1024 * 50)
    }
    
    lazy var imageCache: NSCache<NSString, NSData> = {
        let cache = NSCache<NSString, NSData>()
        cache.countLimit = config.countLimit
        cache.totalCostLimit = config.memoryLimit
        return cache
    }()
    
    lazy var keysCache: NSCache<NSString, NSString> = {
        let cache = NSCache<NSString, NSString>()
        cache.countLimit = config.countLimit
        return cache
    }()
    
    let lock = NSLock()
    let config: Config
    
    private init(config: Config = Config.defaultConfig) {
        self.config = config
    }
}
