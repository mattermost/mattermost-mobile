import UIKit
import Expo
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import AVFoundation
import UserNotifications
import ExpoModulesCore
import mattermost_rnutils
import mattermost_hardware_keyboard
import TurboLogIOSNative
import os.log

@main
class AppDelegate: ExpoAppDelegate, OrientationLockable {
    
    var orientationLock: UIInterfaceOrientationMask = .allButUpsideDown
    
    static let notificationMessageAction = "message"
    static let notificationClearAction = "clear"
    static let notificationUpdateBadgeAction = "update_badge"
    static let notificationTestAction = "test"
    
  override func application(_ application: UIApplication, handleEventsForBackgroundURLSession identifier: String, completionHandler: @escaping () -> Void) {
        os_log(.default, "Mattermost will attach session from handleEventsForBackgroundURLSession!! identifier=%{public}@", identifier)
        GekidouWrapper.default.attachSession(identifier, completionHandler: completionHandler)
        os_log(.default, "Mattermost session ATTACHED from handleEventsForBackgroundURLSession!! identifier=%{public}@", identifier)
    }
    
    override func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        guard let appGroupId = Bundle.main.object(forInfoDictionaryKey: "AppGroupIdentifier") as? String else {
            return false
        }
        
        guard var containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupId) else {
            return false
        }
        
        containerURL = containerURL.appendingPathComponent("Logs")
        
        var error: NSError?
        TurboLog.configure(
            withDailyRolling: false,
            maximumFileSize: 1024 * 1024,
            maximumNumberOfFiles: 2,
            logsDirectory: containerURL.path,
            logsFilename: "MMLogs",
            error: &error
        )
        if let error = error {
            print("Failed to configure TurboLog: \(error.localizedDescription)")
        }
        
        TurboLog.write(with: .info, message: ["Configured turbolog"])
        OrientationManager.shared.delegate = self
        
        if UserDefaults.standard.object(forKey: "FirstRun") == nil {
            let keychain = RNKeychainManager()
            if let servers = keychain.getAllServersForInternetPasswords() {
                TurboLog.write(with: .info, message: ["Servers", servers])
                
                for server in servers {
                    keychain.deleteCredentials(forServer: server, withOptions: nil)
                }
            }
            
            UserDefaults.standard.setValue(true, forKey: "FirstRun")
            UserDefaults.standard.synchronize()
        }
        
        try? AVAudioSession.sharedInstance().setCategory(.playback)
        GekidouWrapper.default.setPreference("true", forKey: "ApplicationIsRunning")
        
        RNNotifications.startMonitorNotifications()
        
        os_log(.default, "Mattermost started!!")
        ReactNativeNavigation.bootstrap(with: self, launchOptions: launchOptions)
        
        return true
    }
    
    override func bridgelessEnabled() -> Bool {
        return false
    }
    
    override func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        RNNotifications.didRegisterForRemoteNotifications(withDeviceToken: deviceToken)
    }
    
    override func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        RNNotifications.didFailToRegisterForRemoteNotificationsWithError(error as NSError)
    }
    
    override func application(_ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable: Any], fetchCompletionHandler   completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
        let state = UIApplication.shared.applicationState
        let action = userInfo["type"] as? String
        let isClearAction = action == AppDelegate.notificationClearAction
        let isTestAction = action == AppDelegate.notificationTestAction
        
        if isTestAction {
            completionHandler(.noData)
            return
        }
        
        if !GekidouWrapper.default.verifySignature(userInfo) {
            var notification = userInfo
            notification["verified"] = "false"
            RNNotifications.didReceiveBackgroundNotification(notification, withCompletionHandler: completionHandler)
            return
        }
        
        if isClearAction {
            NotificationHelper.default.clearChannelOrThreadNotifications(userInfo: userInfo as NSDictionary)
            GekidouWrapper.default.postNotificationReceipt(userInfo)
            RNNotifications.didReceiveBackgroundNotification(userInfo, withCompletionHandler: completionHandler)
            return
        }
        
        if state != .active {
            GekidouWrapper.default.fetchDataForPushNotification(userInfo) { data in
                var notification = userInfo
                if let data = data {
                    do {
                        if let json = try JSONSerialization.jsonObject(with: data, options: []) as? [String: Any] {
                            notification["data"] = json
                        }
                    } catch {
                    }
                }
                RNNotifications.didReceiveBackgroundNotification(notification, withCompletionHandler: completionHandler)
            }
        } else {
            completionHandler(.newData)
        }
    }
    
    override func application(_ application: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return RCTLinkingManager.application(application, open: url, options: options)
    }
    
    override func application(_ application: UIApplication, open url: URL, sourceApplication: String?, annotation: Any) -> Bool {
        return RCTLinkingManager.application(application, open: url, sourceApplication: sourceApplication, annotation: annotation)
    }
    
    override func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
    
    override func applicationDidBecomeActive(_ application: UIApplication) {
        GekidouWrapper.default.setPreference("true", forKey: "ApplicationIsForeground")
    }
    
    override func applicationWillResignActive(_ application: UIApplication) {
        GekidouWrapper.default.setPreference("false", forKey: "ApplicationIsForeground")
    }
    
    override func applicationDidEnterBackground(_ application: UIApplication) {
        GekidouWrapper.default.setPreference("false", forKey: "ApplicationIsForeground")
    }
    
    override func applicationWillTerminate(_ application: UIApplication) {
        GekidouWrapper.default.setPreference("false", forKey: "ApplicationIsForeground")
        GekidouWrapper.default.setPreference("false", forKey: "ApplicationIsRunning")
    }
    
    override func application(_ application: UIApplication, supportedInterfaceOrientationsFor window: UIWindow?) -> UIInterfaceOrientationMask {
        return orientationLock
    }
    
    func extraModules(for bridge: RCTBridge) -> [RCTBridgeModule] {
        var extraModules: [RCTBridgeModule] = []
        extraModules.append(contentsOf: ReactNativeNavigation.extraModules(for: bridge))
        return extraModules
    }
    
    func sourceURL(for bridge: RCTBridge) -> URL? {
        return bundleURL()
    }
    
    override func bundleURL() -> URL? {
        #if DEBUG
        return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
        #else
        return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
        #endif
    }
    
    override var keyCommands: [UIKeyCommand]? {
        return MattermostHardwareKeyboardWrapper.registerKeyCommands(
            enterPressed: #selector(sendEnter(_:)),
            shiftEnterPressed: #selector(sendShiftEnter(_:)),
            findChannels: #selector(sendFindChannels(_:))
        ) as? [UIKeyCommand]
    }
    
    @objc func sendEnter(_ sender: UIKeyCommand) {
        MattermostHardwareKeyboardWrapper.enterKeyPressed()
    }
    
    @objc func sendShiftEnter(_ sender: UIKeyCommand) {
        MattermostHardwareKeyboardWrapper.shiftEnterKeyPressed()
    }
    
    @objc func sendFindChannels(_ sender: UIKeyCommand) {
        MattermostHardwareKeyboardWrapper.findChannels()
    }
}
