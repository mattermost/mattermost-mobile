import UIKit

@objc public protocol OrientationLockable: AnyObject {
    var orientationLock: UIInterfaceOrientationMask {get set}
}
