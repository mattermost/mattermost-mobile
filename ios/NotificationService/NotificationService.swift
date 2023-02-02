import Gekidou
import UserNotifications
import Intents
import os.log

class NotificationService: UNNotificationServiceExtension {
  let preferences = Gekidou.Preferences.default
  let fibonacciBackoffsInSeconds = [1.0, 2.0, 3.0, 5.0, 8.0]
  var contentHandler: ((UNNotificationContent) -> Void)?
  var bestAttemptContent: UNMutableNotificationContent?

  var retryIndex = 0
  
  override init() {
    super.init()
    initSentryAppExt()
  }
  
  override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
    self.contentHandler = contentHandler

    bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)
    if let bestAttemptContent = bestAttemptContent,
       let jsonData = try? JSONSerialization.data(withJSONObject: bestAttemptContent.userInfo),
       let ackNotification = try? JSONDecoder().decode(AckNotification.self, from: jsonData) {
      fetchReceipt(ackNotification)
    } else {
      os_log(OSLogType.default, "Mattermost Notifications: bestAttemptContent seems to be empty, will call sendMessageIntent")
      sendMessageIntent(notification: request.content)
    }
  }

  func processResponse(serverUrl: String, data: Data, bestAttemptContent: UNMutableNotificationContent) {
    bestAttemptContent.userInfo["server_url"] = serverUrl
    os_log(
      OSLogType.default,
      "Mattermost Notifications: process receipt response for serverUrl %{public}@",
      serverUrl
    )
    let json = try? JSONSerialization.jsonObject(with: data) as! [String: Any]
    os_log(
      OSLogType.default,
      "Mattermost Notifications: parsed json response %{public}@",
      String(describing: json != nil)
    )
    if let json = json {
      if let message = json["message"] as? String {
        bestAttemptContent.body = message
      }
      if let channelName = json["channel_name"] as? String {
        bestAttemptContent.title = channelName
      }

      let userInfoKeys = ["channel_name", "team_id", "sender_id", "sender_name", "root_id", "override_username", "override_icon_url", "from_webhook", "message"]
      for key in userInfoKeys {
        if let value = json[key] as? String {
          bestAttemptContent.userInfo[key] = value
        }
      }
    }

    if (preferences.object(forKey: "ApplicationIsForeground") as? String != "true") {
      Network.default.fetchAndStoreDataForPushNotification(bestAttemptContent, withContentHandler: {[weak self] notification in
        os_log(OSLogType.default, "Mattermost Notifications: processed data for db. Will call sendMessageIntent")
        self?.sendMessageIntent(notification: bestAttemptContent)
      })
    } else {
      bestAttemptContent.badge = Gekidou.Database.default.getTotalMentions() as NSNumber
      os_log(OSLogType.default, "Mattermost Notifications: app in the foreground, no data processed. Will call sendMessageIntent")
      sendMessageIntent(notification: bestAttemptContent)
    }
  }
  
  override func serviceExtensionTimeWillExpire() {
    // Called just before the extension will be terminated by the system.
    // Use this as an opportunity to deliver your "best attempt" at modified content, otherwise the original push payload will be used.
    os_log(OSLogType.default, "Mattermost Notifications: service extension time expired")
    if let bestAttemptContent = bestAttemptContent {
      os_log(OSLogType.default, "Mattermost Notifications: calling sendMessageIntent before expiration")
      sendMessageIntent(notification: bestAttemptContent)
    }
  }
  
  func sendMessageIntentCompletion(_ notification: UNNotificationContent, _ avatarData: Data?) {
    if #available(iOSApplicationExtension 15.0, *),
       let imgData = avatarData,
       let channelId = notification.userInfo["channel_id"] as? String {
      os_log(OSLogType.default, "Mattermost Notifications: creating intent")

      let isCRTEnabled = notification.userInfo["is_crt_enabled"] as? Bool ?? false
      let rootId = notification.userInfo["root_id"] as? String ?? ""
      let senderId = notification.userInfo["sender_id"] as? String ?? ""
      let channelName = notification.userInfo["channel_name"] as? String ?? ""
      let message = (notification.userInfo["message"] as? String ?? "")
      let avatar = INImage(imageData: imgData) as INImage?

      var conversationId = channelId
      if isCRTEnabled && !rootId.isEmpty {
        conversationId = rootId
      }

      let handle = INPersonHandle(value: senderId, type: .unknown)
      let sender = INPerson(personHandle: handle,
                            nameComponents: nil,
                            displayName: channelName,
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
          os_log(OSLogType.default, "Mattermost Notifications: sendMessageIntent intent error %{public}@", error! as CVarArg)
        }
        
        do {
          let updatedContent = try notification.updating(from: intent)
          os_log(OSLogType.default, "Mattermost Notifications: present updated notification")
          self.contentHandler?(updatedContent)
        } catch {
          os_log(OSLogType.default, "Mattermost Notifications: something failed updating the notification %{public}@", error as CVarArg)
          self.contentHandler?(notification)
        }
      }
    } else {
      self.contentHandler?(notification)
    }
  }
  
  func sendMessageIntent(notification: UNNotificationContent) {
    if #available(iOSApplicationExtension 15.0, *) {
      guard let serverUrl = notification.userInfo["server_url"] as? String,
            let senderId = notification.userInfo["sender_id"] as? String
      else {
        os_log(OSLogType.default, "Mattermost Notifications: No intent created. will call contentHandler to present notification")
        self.contentHandler?(notification)
        return
      }

      os_log(OSLogType.default, "Mattermost Notifications: Fetching profile Image in server %{public}@ for sender %{public}@", serverUrl, senderId)
      let overrideIconUrl = notification.userInfo["override_icon_url"] as? String
        
      Network.default.fetchProfileImageSync(serverUrl, senderId: senderId, overrideIconUrl: overrideIconUrl) {[weak self] data in
        self?.sendMessageIntentCompletion(notification, data)
      }
    }
  }
  
  func fetchReceipt(_ ackNotification: AckNotification) -> Void {
    if (self.retryIndex >= self.fibonacciBackoffsInSeconds.count) {
      os_log(OSLogType.default, "Mattermost Notifications: max retries reached. Will call sendMessageIntent")
      sendMessageIntent(notification: bestAttemptContent!)
      return
    }

    Network.default.postNotificationReceipt(ackNotification) {data, response, error in
        if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode != 200 {
          os_log(
            OSLogType.default,
            "Mattermost Notifications: notification receipt failed with status %{public}@. Will call sendMessageIntent",
            String(describing: httpResponse.statusCode)
          )
          self.sendMessageIntent(notification: self.bestAttemptContent!)
          return
        }

        guard let data = data, error == nil else {
          if (ackNotification.isIdLoaded) {
            // Receipt retrieval failed. Kick off retries.
            let backoffInSeconds = self.fibonacciBackoffsInSeconds[self.retryIndex]

            DispatchQueue.main.asyncAfter(deadline: .now() + backoffInSeconds, execute: {
              os_log(
                OSLogType.default,
                "Mattermost Notifications: receipt retrieval failed. Retry %{public}@",
                String(describing: self.retryIndex)
              )
              self.fetchReceipt(ackNotification)
            })

            self.retryIndex += 1
          }
          return
        }
      
      self.processResponse(serverUrl: ackNotification.serverUrl, data: data, bestAttemptContent: self.bestAttemptContent!)
      }
  }

}

extension Date {
  var millisecondsSince1970: Int {
    return Int((self.timeIntervalSince1970 * 1000.0).rounded())
  }
  
  init(milliseconds: Int) {
    self = Date(timeIntervalSince1970: TimeInterval(milliseconds) / 1000)
  }
}
