import Foundation

@objc public protocol RNUtilsDelegate {
    func sendEvent(name: String, result: Dictionary<String, Any>?)
}
