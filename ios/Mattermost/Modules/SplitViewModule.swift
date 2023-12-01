import Foundation

@objc(SplitViewModule)
class SplitViewModule: RCTEventEmitter {
  var hasListeners = false

  @objc
  override static func requiresMainQueueSetup() -> Bool {
    return true
  }
      
  @objc
  override func supportedEvents() -> [String]! {
    return ["SplitViewChanged"]
  }
  
  @objc
  override func startObserving() {
    hasListeners = true
    NotificationCenter.default.addObserver(self,
                                           selector: #selector(isSplitView), name: NSNotification.Name.RCTUserInterfaceStyleDidChange,
                                           object: nil)
  }
  
  @objc
  override func stopObserving() {
    hasListeners = false
    NotificationCenter.default.removeObserver(self,
                                              name: NSNotification.Name.RCTUserInterfaceStyleDidChange,
                                              object: nil)
  }
  
  @objc func isRunningInFullScreen() -> Bool {
    guard let w = UIApplication.shared.delegate?.window, let window = w else { return false }
    let screenSize = window.screen.bounds.size.width
    let frameSize = window.frame.size.width
    let shouldBeConsideredFullScreen = frameSize >= (screenSize * 0.6)
    return shouldBeConsideredFullScreen
  }
  
  @objc func isSplitView() {
    if hasListeners && UIDevice.current.userInterfaceIdiom == .pad {
      sendEvent(withName: "SplitViewChanged", body: [
        "isSplitView": !isRunningInFullScreen(),
        "isTablet": UIDevice.current.userInterfaceIdiom == .pad,
      ])
    }
  }
  
  @objc(isRunningInSplitView)
  func isRunningInSplitView() -> Dictionary<String, Bool> {
    let queue = DispatchQueue.main
    let group = DispatchGroup()
    var shouldBeConsideredFullScreen = true
    group.enter()
    queue.async(group: group) { [weak self] in
      shouldBeConsideredFullScreen = self?.isRunningInFullScreen() ?? true
      group.leave()
    }
    group.wait()
    return [
      "isSplitView": !shouldBeConsideredFullScreen,
      "isTablet": UIDevice.current.userInterfaceIdiom == .pad,
    ]
  }
  
  @objc(unlockOrientation)
  func unlockOrientation() {
    DispatchQueue.main.async {
      let appDelegate = UIApplication.shared.delegate as! AppDelegate
      appDelegate.allowRotation = true
      UIDevice.current.setValue(UIInterfaceOrientation.unknown.rawValue, forKey: "orientation")
    }
  }
  
  @objc(lockPortrait)
  func lockPortrait() {
    DispatchQueue.main.async {
      let appDelegate = UIApplication.shared.delegate as! AppDelegate
      appDelegate.allowRotation = false
      UIDevice.current.setValue(UIInterfaceOrientation.unknown.rawValue, forKey: "orientation")
      UIDevice.current.setValue(UIInterfaceOrientation.portrait.rawValue, forKey: "orientation")
    }
  }
}
