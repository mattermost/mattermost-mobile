import Foundation

extension RNUtilsWrapper {
    enum Event: String, CaseIterable {
        case SplitViewChanged
    }
    
    @objc
    public static var supportedEvents: [String] {
        return Event.allCases.map(\.rawValue)
    }
}
