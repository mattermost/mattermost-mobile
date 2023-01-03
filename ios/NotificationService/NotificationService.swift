import Gekidou
import UserNotifications
import Intents

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
      sendMessageIntent(notification: request.content)
    }
  }

  func processResponse(serverUrl: String, data: Data, bestAttemptContent: UNMutableNotificationContent) {
    bestAttemptContent.userInfo["server_url"] = serverUrl
    let json = try? JSONSerialization.jsonObject(with: data) as! [String: Any]
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
        self?.sendMessageIntent(notification: bestAttemptContent)
      })
    } else {
      bestAttemptContent.badge = Gekidou.Database.default.getTotalMentions() as NSNumber
      sendMessageIntent(notification: bestAttemptContent)
    }
  }
  
  override func serviceExtensionTimeWillExpire() {
    // Called just before the extension will be terminated by the system.
    // Use this as an opportunity to deliver your "best attempt" at modified content, otherwise the original push payload will be used.
    if let bestAttemptContent =  bestAttemptContent {
      sendMessageIntent(notification: bestAttemptContent)
    }
  }
  
  func sendMessageIntent(notification: UNNotificationContent) {
    if #available(iOSApplicationExtension 15.0, *) {
      let isCRTEnabled = notification.userInfo["is_crt_enabled"] as! Bool
      let channelId = notification.userInfo["channel_id"] as! String
      let rootId = notification.userInfo.index(forKey: "root_id") != nil ? notification.userInfo["root_id"] as! String : ""
      let senderId = notification.userInfo["sender_id"] as? String ?? ""
      let senderName = notification.userInfo["sender_name"] as? String ?? ""
      let channelName = notification.userInfo["channel_name"] as? String ?? ""
      let overrideIconUrl = notification.userInfo["override_icon_url"] as? String
      let serverUrl = notification.userInfo["server_url"] as? String ?? ""
      let message = (notification.userInfo["message"] as? String ?? "")
      let avatarData = Network.default.fetchProfileImageSync(serverUrl, senderId: senderId, overrideIconUrl: overrideIconUrl)
      
      let handle = INPersonHandle(value: notification.userInfo["sender_id"] as? String, type: .unknown)
      var avatar: INImage?
      if let imgData = avatarData {
        avatar = INImage(imageData: imgData)
      }

      let sender = INPerson(personHandle: handle,
                            nameComponents: nil,
                            displayName: channelName,
                            image: avatar,
                            contactIdentifier: nil,
                            customIdentifier: nil)
      var conversationId = channelId
      if isCRTEnabled && rootId != "" {
        conversationId = rootId
      }
      
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
          return
        }
        
        do {
          let updatedContent = try notification.updating(from: intent)
          self.contentHandler?(updatedContent)
        } catch {
          self.contentHandler?(notification)
        }
      }
    } else {
      self.contentHandler?(notification)
    }
  }
  
  func fetchReceipt(_ ackNotification: AckNotification) -> Void {
    if (self.retryIndex >= self.fibonacciBackoffsInSeconds.count) {
      sendMessageIntent(notification: bestAttemptContent!)
      return
    }

    Network.default.postNotificationReceipt(ackNotification) {data, response, error in
        if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode != 200 {
          self.sendMessageIntent(notification: self.bestAttemptContent!)
          return
        }

        guard let data = data, error == nil else {
          if (ackNotification.isIdLoaded) {
            // Receipt retrieval failed. Kick off retries.
            let backoffInSeconds = self.fibonacciBackoffsInSeconds[self.retryIndex]

            DispatchQueue.main.asyncAfter(deadline: .now() + backoffInSeconds, execute: {
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
