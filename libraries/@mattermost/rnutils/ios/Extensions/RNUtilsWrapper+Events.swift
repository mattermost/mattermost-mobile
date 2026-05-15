import Foundation

extension RNUtilsWrapper {
    enum Event: String, CaseIterable {
        case SplitViewChanged
        case DimensionsChanged
        /// VoIP push token (hex) for iOS CallKit; forward to server as `voip_device_id`.
        case MattermostVoIPToken
    }
    
    @objc
    public static var supportedEvents: [String] {
        return Event.allCases.map(\.rawValue)
    }
}
