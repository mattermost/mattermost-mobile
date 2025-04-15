import Gekidou
import UserNotifications
import Intents
import os.log
import TurboLogIOSNative

class NotificationService: UNNotificationServiceExtension {
  var contentHandler: ((UNNotificationContent) -> Void)?
  var bestAttemptContent: UNMutableNotificationContent?
  
  override init() {
    super.init()
    initSentryAppExt()
    do {
      let appGroupId = Bundle.main.object(forInfoDictionaryKey: "AppGroupIdentifier") as! String
      let containerUrl = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupId)
      try TurboLogIOSNative.TurboLogger.configure(dailyRolling: false, maximumFileSize: 1024*1024, maximumNumberOfFiles: 2, logsDirectory: containerUrl!.appendingPathComponent("Logs").path, logsFilename: "MMLogs")
    } catch {
      os_log(OSLogType.default, "Failed to configure TurboLogger: %{public}@", String(describing: error))
    }
  }
  
  override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
    self.contentHandler = contentHandler

    TurboLogIOSNative.TurboLogger.write(level: .info, message: "Mattermost Notifications: received notification")
    bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)
    if let bestAttemptContent = bestAttemptContent {
      PushNotification.default.postNotificationReceipt(bestAttemptContent, completionHandler: {[weak self] notification in
        if let notification = notification {
          self?.bestAttemptContent = notification
          if (!PushNotification.default.verifySignatureFromNotification(notification)) {
            TurboLogIOSNative.TurboLogger.write(level: .info, message: "Mattermost Notifications: signature not verified. Will call sendInvalidNotificationIntent")
            self?.sendInvalidNotificationIntent()
            return
          }
          if (Gekidou.Preferences.default.object(forKey: "ApplicationIsRunning") as? String != "true") {
            PushNotification.default.fetchAndStoreDataForPushNotification(bestAttemptContent, withContentHandler: {notification in
              TurboLogIOSNative.TurboLogger.write(level: .info, message: "Mattermost Notifications: processed data for db. Will call sendMessageIntent")
              self?.sendMessageIntent()
            })
          } else {
            bestAttemptContent.badge = nil
            TurboLogIOSNative.TurboLogger.write(level: .info, message: "Mattermost Notifications: app in use, no data processed. Will call sendMessageIntent")
            self?.sendMessageIntent()
          }
          return
        }
        
        TurboLogIOSNative.TurboLogger.write(level: .info, message: "Mattermost Notifications: notification receipt seems to be empty, will call sendMessageIntent")
        self?.sendMessageIntent()
      })
    } else {
      TurboLogIOSNative.TurboLogger.write(level: .info, message: "Mattermost Notifications: bestAttemptContent seems to be empty, will call sendMessageIntent")
      sendMessageIntent()
    }
  }

  override func serviceExtensionTimeWillExpire() {
    // Called just before the extension will be terminated by the system.
    // Use this as an opportunity to deliver your "best attempt" at modified content, otherwise the original push payload will be used.
    TurboLogIOSNative.TurboLogger.write(level: .info, message: "Mattermost Notifications: service extension time expired")
    TurboLogIOSNative.TurboLogger.write(level: .info, message: "Mattermost Notifications: calling sendMessageIntent before expiration")
    sendMessageIntent()
  }
  
  private func sendMessageIntent() {
    guard let notification = bestAttemptContent else { return }
    if #available(iOSApplicationExtension 15.0, *) {
      let overrideUsername = notification.userInfo["override_username"] as? String
      let senderId = notification.userInfo["sender_id"] as? String

      guard let serverUrl = notification.userInfo["server_url"] as? String
      else {
        TurboLogIOSNative.TurboLogger.write(level: .info, message: "Mattermost Notifications: No intent created. will call contentHandler to present notification")
        self.contentHandler?(notification)
        return
      }

      let overrideIconUrl = notification.userInfo["override_icon_url"] as? String
      TurboLogIOSNative.TurboLogger.write(level: .info, message: "Mattermost Notifications: Fetching profile Image in server", serverUrl, "for sender", senderId ?? overrideUsername ?? "no sender is set")
      if senderId != nil || overrideIconUrl != nil {
        PushNotification.default.fetchProfileImageSync(serverUrl, senderId: senderId ?? "", overrideIconUrl: overrideIconUrl) {[weak self] data in
          self?.sendMessageIntentCompletion(data)
        }
      } else {
        self.sendMessageIntentCompletion(nil)
      }
    }
  }
  
  private func sendInvalidNotificationIntent() {
    guard let notification = bestAttemptContent else { return }
    TurboLogIOSNative.TurboLogger.write(level: .info, message: "Mattermost Notifications: creating invalid intent")
    
    bestAttemptContent?.body = NSLocalizedString( "native.ios.notifications.not_verified",
      value: "We could not verify this notification with the server",
      comment: "")
    bestAttemptContent?.userInfo.updateValue("false", forKey: "verified")
    
    if #available(iOSApplicationExtension 15.0, *) {
      let intent = INSendMessageIntent(recipients: nil,
                                       outgoingMessageType: .outgoingMessageText,
                                       content: "We could not verify this notification with the server",
                                       speakableGroupName: nil,
                                       conversationIdentifier: "NOT_VERIFIED",
                                       serviceName: nil,
                                       sender: nil,
                                       attachments: nil)
      
      let interaction = INInteraction(intent: intent, response: nil)
      interaction.direction = .incoming
      interaction.donate { error in
        if error != nil {
          self.contentHandler?(notification)
          TurboLogIOSNative.TurboLogger.write(level: .info, message: "Mattermost Notifications: sendMessageIntent intent error", error! as CVarArg)
        }
        
        do {
          let updatedContent = try notification.updating(from: intent)
          TurboLogIOSNative.TurboLogger.write(level: .info, message: "Mattermost Notifications: present updated notification")
          self.contentHandler?(updatedContent)
        } catch {
          TurboLogIOSNative.TurboLogger.write(level: .info, message: "Mattermost Notifications: something failed updating the notification", error as CVarArg)
          self.contentHandler?(notification)
        }
      }
    } else {
      self.contentHandler?(notification)
    }
  }

  private func sendMessageIntentCompletion(_ avatarData: Data?) {
    guard let notification = bestAttemptContent else { return }
    if #available(iOSApplicationExtension 15.0, *),
       let imgData = avatarData,
       let channelId = notification.userInfo["channel_id"] as? String {
      TurboLogIOSNative.TurboLogger.write(level: .info, message: "Mattermost Notifications: creating intent")

      let isCRTEnabled = notification.userInfo["is_crt_enabled"] as? Bool ?? false
      let rootId = notification.userInfo["root_id"] as? String ?? ""
      let senderName = notification.userInfo["sender_name"] as? String
      let channelName = notification.userInfo["channel_name"] as? String
      var message = (notification.userInfo["message"] as? String ?? "")
      let overrideUsername = notification.userInfo["override_username"] as? String
      let senderId = notification.userInfo["sender_id"] as? String
      let senderIdentifier = overrideUsername ?? senderId
      let avatar = INImage(imageData: imgData) as INImage?

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

      let interaction = INInteraction(intent: intent, response: nil)
      interaction.direction = .incoming
      interaction.donate { error in
        if error != nil {
          self.contentHandler?(notification)
          TurboLogIOSNative.TurboLogger.write(level: .info, message: "Mattermost Notifications: sendMessageIntent intent error", error! as CVarArg)
        }
        
        do {
          let updatedContent = try notification.updating(from: intent)
          TurboLogIOSNative.TurboLogger.write(level: .info, message: "Mattermost Notifications: present updated notification")
          self.contentHandler?(updatedContent)
        } catch {
          TurboLogIOSNative.TurboLogger.write(level: .info, message: "Mattermost Notifications: something failed updating the notification", error as CVarArg)
          self.contentHandler?(notification)
        }
      }
    } else {
      self.contentHandler?(notification)
    }
  }
}
