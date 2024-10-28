import Foundation

public class OrientationManager: NSObject {
    @objc public static let shared = OrientationManager()
    @objc public weak var delegate: OrientationLockable?
    
    private override init() {}
    
    @objc public func lockOrientation() {
        delegate?.orientationLock = .portrait
    }
    
    @objc public func unlockOrientation() {
        delegate?.orientationLock = .allButUpsideDown
    }
}
