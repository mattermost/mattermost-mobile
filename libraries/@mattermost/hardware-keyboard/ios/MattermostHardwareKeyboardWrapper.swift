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
        
        enter.title = NSLocalizedString("native.ios.hardware_keyboard.send_message", bundle: .main, value: "Send message", comment: "Hardware keyboard shortcut")
        enter.discoverabilityTitle = enter.title
        shiftEnter.title = NSLocalizedString("native.ios.hardware_keyboard.new_line", bundle: .main, value: "Add new line", comment: "Hardware keyboard shortcut")
        shiftEnter.discoverabilityTitle = shiftEnter.title
        findChannels.title = NSLocalizedString("native.ios.hardware_keyboard.find_channels", bundle: .main, value: "Find channels", comment: "Hardware keyboard shortcut")
        findChannels.discoverabilityTitle = findChannels.title
        enter.wantsPriorityOverSystemBehavior = true
        shiftEnter.wantsPriorityOverSystemBehavior = true
        findChannels.wantsPriorityOverSystemBehavior = true
        
        commands.add(enter)
        commands.add(shiftEnter)
        commands.add(findChannels)
        
        return commands
    }
}
