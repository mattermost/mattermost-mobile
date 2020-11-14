import UIKit

@objc class RuntimeUtils: NSObject {
  @objc func delay(seconds delay:Double, closure:@escaping () -> ()) {
    DispatchQueue.main.asyncAfter(deadline: DispatchTime.now() + Double(Int64(delay*Double(NSEC_PER_SEC))) / Double(NSEC_PER_SEC), execute: closure)
  }
}
