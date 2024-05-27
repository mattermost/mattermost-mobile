import Foundation

@objc public class MattermostHardwareKeyboardWrapper: NSObject {
    @objc public static weak var delegate: MattermostHardwareKeyboardDelegate? = nil
    
    private override init() {}
    
    @objc public static func enterKeyPressed() {
        delegate?.sendEvent(name: Event.mmHardwareKeyboardEvent.rawValue, result: [
            "action": "enter"
        ])
    }
    
    @objc public static func shiftEnterKeyPressed() {
        delegate?.sendEvent(name: Event.mmHardwareKeyboardEvent.rawValue, result: [
            "action": "shift-enter"
        ])
    }
    
    @objc public static func findChannels() {
        delegate?.sendEvent(name: Event.mmHardwareKeyboardEvent.rawValue, result: [
            "action": "find-channels"
        ])
    }
    
    @objc public static func registerKeyCommands(enterPressed: Selector, shiftEnterPressed: Selector, findChannels: Selector) -> NSMutableArray {
        let commands = NSMutableArray()
        let enter = UIKeyCommand(input: "\r", modifierFlags: [], action: enterPressed)
        let shiftEnter = UIKeyCommand(input: "\r", modifierFlags: .shift, action: shiftEnterPressed)
        let findChannels = UIKeyCommand(input: "k", modifierFlags: .command, action: findChannels)
        
        if #available(iOS 13.0, *) {
            enter.title = "Send message"
            enter.discoverabilityTitle = "Send message"
            shiftEnter.title = "Add new line"
            shiftEnter.discoverabilityTitle = "Add new line"
            findChannels.title = "Find channels"
            findChannels.discoverabilityTitle = "Find channels"
        }
        if #available(iOS 15.0, *) {
            enter.wantsPriorityOverSystemBehavior = true
            shiftEnter.wantsPriorityOverSystemBehavior = true
            findChannels.wantsPriorityOverSystemBehavior = true
        }
        
        commands.add(enter)
        commands.add(shiftEnter)
        commands.add(findChannels)
        
        return commands
    }
}
