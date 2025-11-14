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
    
    @objc override public func addListener(_ eventName: String!) {
        //No-op: Required for RN  built-in emitters
    }
    
    @objc override public func removeListeners(_ count: Double) {
        //No-op: Required for RN  built-in emitters
    }
}
