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

          let json = try? JSONSerialization.jsonObject(with: data, options: .allowFragments) as! Dictionary<String,Any>
          bestAttemptContent.title = json!["channel_name"] as! String
          bestAttemptContent.body = json!["message"] as! String

          bestAttemptContent.userInfo["channel_name"] = json!["channel_name"] as! String
          bestAttemptContent.userInfo["team_id"] = json!["team_id"] as? String
          bestAttemptContent.userInfo["sender_id"] = json!["sender_id"] as! String
          bestAttemptContent.userInfo["sender_name"] = json!["sender_name"] as! String
          bestAttemptContent.userInfo["root_id"] = json!["root_id"] as? String
          bestAttemptContent.userInfo["override_username"] = json!["override_username"] as? String
          bestAttemptContent.userInfo["override_icon_url"] = json!["override_icon_url"] as? String
          bestAttemptContent.userInfo["from_webhook"] = json!["from_webhook"] as? String
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
