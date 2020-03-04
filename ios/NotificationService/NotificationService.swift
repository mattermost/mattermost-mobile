import UserNotifications
import UploadAttachments

class NotificationService: UNNotificationServiceExtension {
  
  var contentHandler: ((UNNotificationContent) -> Void)?
  var bestAttemptContent: UNMutableNotificationContent?
  
  override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
    self.contentHandler = contentHandler
    bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)
    if let bestAttemptContent = bestAttemptContent {
      let ackId = bestAttemptContent.userInfo["ack_id"]
      let type = bestAttemptContent.userInfo["type"]
      let postId = bestAttemptContent.userInfo["post_id"]
      let idLoaded = bestAttemptContent.userInfo["id_loaded"] ?? false
      UploadSession.shared.notificationReceipt(
        notificationId: ackId,
        receivedAt: Date().millisencondsSince1970,
        type: type,
        postId: postId,
        idLoaded: idLoaded as! Bool
      ) { data, error in
        if (idLoaded as! Bool) {
          guard let data = data, error == nil else {
            return
          }

          let json = try? JSONSerialization.jsonObject(with: data) as! [String: Any]
          if let json = json {
            if let message = json["message"] as? String {
              bestAttemptContent.body = message
            }
            if let channelName = json["channel_name"] as? String {
              bestAttemptContent.title = channelName
            }

            let userInfoKeys = ["channel_name", "team_id", "sender_id", "root_id", "override_username", "override_icon_url", "from_webhook"]
            for key in userInfoKeys {
              if let value = json[key] as? String {
                bestAttemptContent.userInfo[key] = value
              }
            }
          }
        }

        contentHandler(bestAttemptContent)
      }
    }
  }
  
  override func serviceExtensionTimeWillExpire() {
    // Called just before the extension will be terminated by the system.
    // Use this as an opportunity to deliver your "best attempt" at modified content, otherwise the original push payload will be used.
    if let contentHandler = contentHandler, let bestAttemptContent =  bestAttemptContent {
      contentHandler(bestAttemptContent)
    }
  }
  
}

extension Date {
  var millisencondsSince1970: Int {
    return Int((self.timeIntervalSince1970 * 1000.0).rounded())
  }
  
  init(milliseconds: Int) {
    self = Date(timeIntervalSince1970: TimeInterval(milliseconds) / 1000)
  }
}
