import Foundation
import React

@objc(MattermostShare)
public class MattermostShare: RCTEventEmitter {
    @objc override public static func moduleName() -> String! {
        return "MattermostShare"
    }
    
    @objc override public static func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    override public func supportedEvents() -> [String]! {
        return ["onDraftUpdated"]
    }
    
    @objc public func sendDraftUpdate(_ draft: [String: Any]) {
        sendEvent(withName: "onDraftUpdated", body: draft)
    }
}
