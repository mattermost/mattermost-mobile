import Foundation

extension RNUtilsWrapper {
    enum Event: String, CaseIterable {
        case SplitViewChanged
        case DimensionsChanged
    }
    
    @objc
    public static var supportedEvents: [String] {
        return Event.allCases.map(\.rawValue)
    }
}
