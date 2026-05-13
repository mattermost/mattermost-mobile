import AVFoundation
internal import Expo
import React
import ReactAppDependencyProvider
import RNKeychain
import RNNotifications
import RNSentry
import react_native_paste_input
import mattermost_rnutils
import mattermost_hardware_keyboard
import TurboLogIOSNative
import UIKit
import UserNotifications
import os.log

#if canImport(MSAL)
import MSAL
#endif

#if canImport(mattermost_intune)
import mattermost_intune
#endif

private let notificationClearAction = "clear"
private let notificationTestAction = "test"

@main
class AppDelegate: ExpoAppDelegate, OrientationLockable {
    @objc var orientationLock: UIInterfaceOrientationMask = .allButUpsideDown

    var window: UIWindow?

    var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
    var reactNativeFactory: RCTReactNativeFactory?

    override func application(
        _ application: UIApplication,
        handleEventsForBackgroundURLSession identifier: String,
        completionHandler: @escaping () -> Void
    ) {
        os_log("Mattermost will attach session from handleEventsForBackgroundURLSession!! identifier=%{public}@", identifier)
        GekidouWrapper.default.attachSession(identifier, completionHandler: completionHandler)
        os_log("Mattermost session ATTACHED from handleEventsForBackgroundURLSession!! identifier=%{public}@", identifier)
    }

    override func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        // Initialize Sentry early for native crash reporting (only when DSN is configured)
        if let optionsPath = Bundle.main.path(forResource: "sentry.options", ofType: "json"),
           let data = try? Data(contentsOf: URL(fileURLWithPath: optionsPath)),
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let dsn = json["dsn"] as? String, !dsn.isEmpty {
            RNSentrySDK.start()
        }

        // Configure TurboLog
        if let appGroupId = Bundle.main.object(forInfoDictionaryKey: "AppGroupIdentifier") as? String,
           let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupId) {
            let logsURL = containerURL.appendingPathComponent("Logs")
            do {
                try TurboLogger.configure(
                    dailyRolling: false,
                    maximumFileSize: 1024 * 1024,
                    maximumNumberOfFiles: 2,
                    logsDirectory: logsURL.path,
                    logsFilename: "MMLogs"
                )
            } catch {
                NSLog("Failed to configure TurboLog: %@", error.localizedDescription)
            }
            TurboLogger.write(level: .info, message: "Configured turbolog")
        }

        // Configure Gekidou to use TurboLog via wrapper
        GekidouWrapper.default.configureTurboLogForGekidou()

        #if canImport(mattermost_intune)
        // Initialize Intune MAM delegates BEFORE React Native
        IntuneAccess.initializeIntuneDelegates()
        #endif

        OrientationManager.shared.delegate = self

        // Clear keychain on first run in case of reinstallation
        if UserDefaults.standard.object(forKey: "FirstRun") == nil {
            let keychain = RNKeychainManager()
          if let servers = keychain.getAllServersForInternetPasswords() {
                TurboLogger.write(level: .info, message: "Servers \(servers)")
                for server in servers {
                    keychain.deleteCredentials(forServer: server, withOptions: nil)
                }
            }
            UserDefaults.standard.set(true, forKey: "FirstRun")
            UserDefaults.standard.synchronize()
        }

        try? AVAudioSession.sharedInstance().setCategory(.playback)
        GekidouWrapper.default.setPreference("true", forKey: "ApplicationIsRunning")

        RNNotifications.startMonitorNotifications()

        let delegate = ReactNativeDelegate()
        let factory = ExpoReactNativeFactory(delegate: delegate)
        delegate.dependencyProvider = RCTAppDependencyProvider()

        reactNativeDelegate = delegate
        reactNativeFactory = factory

        #if os(iOS) || os(tvOS)
        window = UIWindow(frame: UIScreen.main.bounds)
        factory.startReactNative(
            withModuleName: "Mattermost",
            in: window,
            launchOptions: launchOptions
        )
        #endif

        let result = super.application(application, didFinishLaunchingWithOptions: launchOptions)

        os_log("Mattermost started!!")

        if let factory = reactNativeFactory {
            PasteInputModule.setup(factory.rootViewFactory)
        }

        #if canImport(mattermost_intune)
        // Restore enrollments if needed (silent, non-blocking)
        IntuneAccess.checkAndRestoreEnrollmentOnLaunch()
        #endif

        return result
    }

    // MARK: - Remote Notifications

    override func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        RNNotifications.didRegisterForRemoteNotifications(withDeviceToken: deviceToken)
    }

    override func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        RNNotifications.didFailToRegisterForRemoteNotificationsWithError(error)
    }

    override func application(
        _ application: UIApplication,
        didReceiveRemoteNotification userInfo: [AnyHashable: Any],
        fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
    ) {
        let state = UIApplication.shared.applicationState
        let action = userInfo["type"] as? String
        let isClearAction = action == notificationClearAction
        let isTestAction = action == notificationTestAction

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
                        } else {
                            TurboLogger.write(level: .warning, message: "Mattermost AppDelegate: JSON serialization returned nil without error")
                        }
                    } catch {
                        TurboLogger.write(level: .error, message: "Mattermost AppDelegate: JSON serialization error \(error.localizedDescription)")
                    }
                }
                RNNotifications.didReceiveBackgroundNotification(notification, withCompletionHandler: completionHandler)
            }
        } else {
            completionHandler(.newData)
        }
    }

    // MARK: - Deep Linking

    override func application(
        _ app: UIApplication,
        open url: URL,
        options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    ) -> Bool {
        if handleMSALURL(url) {
            return true
        }
        return RCTLinkingManager.application(app, open: url, options: options)
    }

    func application(
        _ application: UIApplication,
        open url: URL,
        sourceApplication: String?,
        annotation: Any
    ) -> Bool {
        if handleMSALURL(url) {
            return true
        }
        return RCTLinkingManager.application(application, open: url, sourceApplication: sourceApplication, annotation: annotation)
    }

    private func handleMSALURL(_ url: URL) -> Bool {
        #if canImport(MSAL)
        if let bundleId = Bundle.main.bundleIdentifier,
           url.absoluteString.hasPrefix("msauth.\(bundleId)") {
            TurboLogger.write(level: .info, message: "[Intune] MSAL URL handled")
            return MSALPublicClientApplication.handleMSALResponse(url, sourceApplication: nil)
        }
        #endif
        return false
    }

    override func application(
        _ application: UIApplication,
        continue userActivity: NSUserActivity,
        restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
    ) -> Bool {
        return RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    // MARK: - App Lifecycle

    override func applicationDidBecomeActive(_ application: UIApplication) {
        super.applicationDidBecomeActive(application)
        GekidouWrapper.default.setPreference("true", forKey: "ApplicationIsForeground")
    }

    override func applicationWillResignActive(_ application: UIApplication) {
        super.applicationWillResignActive(application)
        GekidouWrapper.default.setPreference("false", forKey: "ApplicationIsForeground")
    }

    override func applicationDidEnterBackground(_ application: UIApplication) {
        super.applicationDidEnterBackground(application)
        GekidouWrapper.default.setPreference("false", forKey: "ApplicationIsForeground")
    }

    override func applicationWillTerminate(_ application: UIApplication) {
        super.applicationWillTerminate(application)
        GekidouWrapper.default.setPreference("false", forKey: "ApplicationIsForeground")
        GekidouWrapper.default.setPreference("false", forKey: "ApplicationIsRunning")
    }

    // MARK: - Orientation

    override func application(
        _ application: UIApplication,
        supportedInterfaceOrientationsFor window: UIWindow?
    ) -> UIInterfaceOrientationMask {
        return orientationLock
    }

    // MARK: - Hardware Keyboard

    override var keyCommands: [UIKeyCommand]? {
        return MattermostHardwareKeyboardWrapper.registerKeyCommands(
            enterPressed: #selector(sendEnter(_:)),
            shiftEnterPressed: #selector(sendShiftEnter(_:)),
            findChannels: #selector(sendFindChannels(_:))
        ) as? [UIKeyCommand]
    }

    @objc private func sendEnter(_ sender: UIKeyCommand) {
        MattermostHardwareKeyboardWrapper.enterKeyPressed()
    }

    @objc private func sendShiftEnter(_ sender: UIKeyCommand) {
        MattermostHardwareKeyboardWrapper.shiftEnterKeyPressed()
    }

    @objc private func sendFindChannels(_ sender: UIKeyCommand) {
        MattermostHardwareKeyboardWrapper.findChannels()
    }
}

// MARK: - ReactNativeDelegate

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
    override func bundleURL() -> URL? {
        #if DEBUG
        return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
        #else
        return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
        #endif
    }
}
