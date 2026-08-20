import Gekidou
import UserNotifications
import Intents
import os.log
import TurboLogIOSNative

class NotificationService: UNNotificationServiceExtension {

  // Thread-safe wrapper to ensure contentHandler is called exactly once
  // This prevents crashes from multiple contentHandler invocations which terminates the extension
  private class ContentHandlerSafeWrapper {
    private var handler: ((UNNotificationContent) -> Void)?
    private let lock = NSLock()
    private var hasBeenCalled = false

    init(_ handler: @escaping (UNNotificationContent) -> Void) {
      self.handler = handler
    }

    func callOnce(with content: UNNotificationContent) {
      lock.lock()
      defer { lock.unlock() }

      guard !hasBeenCalled, let handler = handler else {
        return
      }

      hasBeenCalled = true
      handler(content)
      self.handler = nil
    }
  }

  private var contentHandlerWrapper: ContentHandlerSafeWrapper?
  private var isLoggerConfigured = false

  // Thread-safe access to bestAttemptContent
  private let contentQueue = DispatchQueue(label: "com.mattermost.notification.content", attributes: .concurrent)
  private var _bestAttemptContent: UNMutableNotificationContent?

  var bestAttemptContent: UNMutableNotificationContent? {
    get {
      return contentQueue.sync { _bestAttemptContent }
    }
    set {
      contentQueue.sync(flags: .barrier) { [weak self] in
        self?._bestAttemptContent = newValue
      }
    }
  }

  override init() {
    super.init()
    initSentryAppExt()

    // Safely configure TurboLogger without force unwrapping
    guard let appGroupId = Bundle.main.object(forInfoDictionaryKey: "AppGroupIdentifier") as? String else {
      os_log(OSLogType.error, "NotificationService init: AppGroupIdentifier missing from Info.plist")
      return
    }

    guard let containerUrl = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupId) else {
      os_log(OSLogType.error, "NotificationService init: Failed to get container URL for app group: %{public}@", appGroupId)
      return
    }

    do {
      try TurboLogIOSNative.TurboLogger.configure(
        dailyRolling: false,
        maximumFileSize: 1024*1024,
        maximumNumberOfFiles: 2,
        logsDirectory: containerUrl.appendingPathComponent("Logs").path,
        logsFilename: "MMLogs"
      )
      isLoggerConfigured = true

      // Configure Gekidou to use TurboLogger
      Gekidou.GekidouLogger.shared.setLogHandler { level, message in
        let turboLevel: TurboLogIOSNative.TurboLogLevel
        switch level {
        case .debug:
          turboLevel = .debug
        case .info:
          turboLevel = .info
        case .warning:
          turboLevel = .warning
        case .error:
          turboLevel = .error
        }

        // Message is already formatted by GekidouLogger
        TurboLogIOSNative.TurboLogger.write(level: turboLevel, message: message)
      }
    } catch {
      os_log(OSLogType.error, "NotificationService init: Failed to configure TurboLogger: %{public}@", String(describing: error))
    }
  }
  
  override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
    // Create thread-safe wrapper for contentHandler
    self.contentHandlerWrapper = ContentHandlerSafeWrapper(contentHandler)

    Gekidou.GekidouLogger.shared.log(.info, "NotificationService didReceive: received notification")
    bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)
    if let bestAttemptContent = bestAttemptContent {
      PushNotification.default.postNotificationReceipt(bestAttemptContent, completionHandler: {[weak self] notification in
        guard let self = self else { return }

        if let notification = notification {
          self.bestAttemptContent = notification
          if (!PushNotification.default.verifySignatureFromNotification(notification)) {
            Gekidou.GekidouLogger.shared.log(.info, "NotificationService didReceive: signature not verified. Will call sendInvalidNotificationIntent")
            self.sendInvalidNotificationIntent()
            return
          }
          if (Gekidou.Preferences.default.object(forKey: "ApplicationIsRunning") as? String != "true") {
            Gekidou.GekidouLogger.shared.log(.debug, "NotificationService didReceive: app not in use, processing data to store in db")
            PushNotification.default.fetchAndStoreDataForPushNotification(notification, withContentHandler: {[weak self] notification in
              guard let self = self else { return }
              Gekidou.GekidouLogger.shared.log(.info, "NotificationService didReceive: processed data for db. Will call sendMessageIntent")
              self.sendMessageIntent()
            })
          } else {
            notification.badge = nil
            Gekidou.GekidouLogger.shared.log(.info, "NotificationService didReceive: app in use, no data processed. Will call sendMessageIntent")
            self.sendMessageIntent()
          }
          return
        }

        Gekidou.GekidouLogger.shared.log(.info, "NotificationService didReceive: notification receipt seems to be empty, will call sendMessageIntent")
        self.sendMessageIntent()
      })
    } else {
      Gekidou.GekidouLogger.shared.log(.info, "NotificationService didReceive: bestAttemptContent seems to be empty, will call sendMessageIntent")
      sendMessageIntent()
    }
  }

  override func serviceExtensionTimeWillExpire() {
    // Called just before the extension will be terminated by the system.
    // Use this as an opportunity to deliver your "best attempt" at modified content, otherwise the original push payload will be used.
    Gekidou.GekidouLogger.shared.log(.info, "NotificationService serviceExtensionTimeWillExpire: service extension time expired")

    // Cancel all pending network requests to prevent callbacks after termination
    Network.default.cancelAllRequests()

    // Deliver the best content we have, even if incomplete
    if let bestAttemptContent = bestAttemptContent {
      Gekidou.GekidouLogger.shared.log(.info, "NotificationService serviceExtensionTimeWillExpire: delivering best attempt content before expiration")
      contentHandlerWrapper?.callOnce(with: bestAttemptContent)
    }
  }
  
  private func sendMessageIntent() {
    guard let notification = bestAttemptContent else { return }
    if #available(iOSApplicationExtension 15.0, *) {
      let overrideUsername = notification.userInfo["override_username"] as? String
      let senderId = notification.userInfo["sender_id"] as? String

      guard let serverUrl = notification.userInfo["server_url"] as? String
      else {
        Gekidou.GekidouLogger.shared.log(.info, "NotificationService sendMessageIntent: No intent created. will call contentHandler to present notification")
        contentHandlerWrapper?.callOnce(with: notification)
        return
      }

      let overrideIconUrl = notification.userInfo["override_icon_url"] as? String
      Gekidou.GekidouLogger.shared.log(.info, "NotificationService sendMessageIntent: Fetching profile Image in server", serverUrl, "for sender", senderId ?? overrideUsername ?? "no sender is set")
      if senderId != nil || overrideIconUrl != nil {
        PushNotification.default.fetchProfileImageSync(serverUrl, senderId: senderId ?? "", overrideIconUrl: overrideIconUrl) {[weak self] data in
          self?.sendMessageIntentCompletion(data)
        }
      } else {
        self.sendMessageIntentCompletion(nil)
      }
    } else {
      // iOS < 15.0, deliver notification without intent
      contentHandlerWrapper?.callOnce(with: notification)
    }
  }
  
  // Helper method to donate INIntent (assumes already on main thread)
  @available(iOSApplicationExtension 15.0, *)
  private func donateIntent(_ intent: INSendMessageIntent, with notification: UNNotificationContent) {
    let interaction = INInteraction(intent: intent, response: nil)
    interaction.direction = .incoming
    interaction.donate { [weak self] error in
      guard let self = self else { return }

      if let error = error {
        Gekidou.GekidouLogger.shared.log(.error, "NotificationService donateIntent: intent donation error: \(String(describing: error))")
        self.contentHandlerWrapper?.callOnce(with: notification)
        return
      }

      do {
        let updatedContent = try notification.updating(from: intent)
        Gekidou.GekidouLogger.shared.log(.info, "NotificationService donateIntent: present updated notification")
        self.contentHandlerWrapper?.callOnce(with: updatedContent)
      } catch {
        Gekidou.GekidouLogger.shared.log(.error, "NotificationService donateIntent: failed updating notification from intent: \(String(describing: error))")
        self.contentHandlerWrapper?.callOnce(with: notification)
      }
    }
  }

  private func sendInvalidNotificationIntent() {
    guard let notification = bestAttemptContent else { return }
    Gekidou.GekidouLogger.shared.log(.info, "NotificationService sendInvalidNotificationIntent: creating invalid intent")

    bestAttemptContent?.body = NSLocalizedString( "native.ios.notifications.not_verified",
      value: "We could not verify this notification with the server",
      comment: "")
    bestAttemptContent?.userInfo.updateValue("false", forKey: "verified")

    if #available(iOSApplicationExtension 15.0, *) {
      // Create INIntent on main thread for thread safety
      DispatchQueue.main.async { [weak self] in
        guard let self = self else { return }

        let intent = INSendMessageIntent(recipients: nil,
                                         outgoingMessageType: .outgoingMessageText,
                                         content: "We could not verify this notification with the server",
                                         speakableGroupName: nil,
                                         conversationIdentifier: "NOT_VERIFIED",
                                         serviceName: nil,
                                         sender: nil,
                                         attachments: nil)
        self.donateIntent(intent, with: notification)
      }
    } else {
      contentHandlerWrapper?.callOnce(with: notification)
    }
  }

  private func sendMessageIntentCompletion(_ avatarData: Data?) {
    guard let notification = bestAttemptContent else { return }
    if #available(iOSApplicationExtension 15.0, *),
       let imgData = avatarData,
       let channelId = notification.userInfo["channel_id"] as? String {
      Gekidou.GekidouLogger.shared.log(.info, "NotificationService sendMessageIntentCompletion: creating intent")

      let isCRTEnabled = notification.userInfo["is_crt_enabled"] as? Bool ?? false
      let rootId = notification.userInfo["root_id"] as? String ?? ""
      let senderName = notification.userInfo["sender_name"] as? String
      let channelName = notification.userInfo["channel_name"] as? String
      var message = (notification.userInfo["message"] as? String ?? "")
      let overrideUsername = notification.userInfo["override_username"] as? String
      let senderId = notification.userInfo["sender_id"] as? String
      let senderIdentifier = overrideUsername ?? senderId

      var conversationId = channelId
      if isCRTEnabled && !rootId.isEmpty {
        conversationId = rootId
      }

      if channelName == nil && message == "",
         let senderName = senderName,
         let body = bestAttemptContent?.body {
        message = body.replacingOccurrences(of: "\(senderName) ", with: "")
        bestAttemptContent?.body = message
      }

      // INImage must be created on main thread per Apple documentation
      // This prevents crashes when interacting with the Intents framework
      DispatchQueue.main.async { [weak self] in
        guard let self = self else {
          return
        }

        guard let updatedNotification = self.bestAttemptContent else {
          self.contentHandlerWrapper?.callOnce(with: notification)
          return
        }

        // Create INImage on main thread
        let avatar = INImage(imageData: imgData) as INImage?

        let handle = INPersonHandle(value: senderIdentifier, type: .unknown)
        let sender = INPerson(personHandle: handle,
                              nameComponents: nil,
                              displayName: channelName ?? senderName,
                              image: avatar,
                              contactIdentifier: nil,
                              customIdentifier: nil)

        let intent = INSendMessageIntent(recipients: nil,
                                         outgoingMessageType: .outgoingMessageText,
                                         content: message,
                                         speakableGroupName: nil,
                                         conversationIdentifier: conversationId,
                                         serviceName: nil,
                                         sender: sender,
                                         attachments: nil)

        self.donateIntent(intent, with: updatedNotification)
      }
    } else {
      contentHandlerWrapper?.callOnce(with: notification)
    }
  }
}
