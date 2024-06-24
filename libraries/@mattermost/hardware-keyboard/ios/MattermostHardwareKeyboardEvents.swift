import Foundation

@objc public protocol MattermostHardwareKeyboardDelegate {
    func sendEvent(name: String, result: Dictionary<String, String>)
}

extension MattermostHardwareKeyboardWrapper {
    enum Event: String, CaseIterable {
        case mmHardwareKeyboardEvent
    }
    
    @objc public static var supportedEvents: [String] {
        return Event.allCases.map(\.rawValue)
    }
}
