import UserNotifications
import UploadAttachments

class NotificationService: UNNotificationServiceExtension {
  
  var contentHandler: ((UNNotificationContent) -> Void)?
  var bestAttemptContent: UNMutableNotificationContent?
  var sendFailed = false;
  
  override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
    self.contentHandler = contentHandler
    bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)
    if let bestAttemptContent = bestAttemptContent {
      let ackId = bestAttemptContent.userInfo["ack_id"]
      let type = bestAttemptContent.userInfo["type"]
      let postId = bestAttemptContent.userInfo["post_id"]
      let idLoaded = (bestAttemptContent.userInfo["id_loaded"] ?? false) as! Bool

      UploadSession.shared.notificationReceipt(
        notificationId: ackId,
        receivedAt: Date().millisecondsSince1970,
        type: type,
        postId: postId,
        idLoaded: idLoaded
      ) { data, error in
        guard let data = data, error == nil else {
          if (idLoaded) {
            self.sendFailed = true;
            let fibonacciBackoffsInSeconds = [1.0, 2.0, 3.0, 5.0, 8.0]
            for backoffInSeconds in fibonacciBackoffsInSeconds {
              let timer = Timer.scheduledTimer(withTimeInterval: backoffInSeconds, repeats: false) { timer in
                UploadSession.shared.notificationReceipt(
                  notificationId: ackId,
                  receivedAt: Date().millisecondsSince1970,
                  type: type,
                  postId: postId,
                  idLoaded: idLoaded
                ) { data, error in
                  guard let data = data, error == nil else {
                    self.sendFailed = true;
                    return
                  }
                  self.processResponse(data: data, bestAttemptContent: bestAttemptContent, contentHandler: contentHandler)
                }
              }
              
              if (self.sendFailed) {
                self.sendFailed = false
                timer.fire()
              } else {
                break
              }
            }
          }
          return
        }
        self.processResponse(data: data, bestAttemptContent: bestAttemptContent, contentHandler: contentHandler)
      }
    }
  }

  func processResponse(data: Data, bestAttemptContent: UNMutableNotificationContent, contentHandler: ((UNNotificationContent) -> Void)?) {
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
    if let contentHandler = contentHandler {
      contentHandler(bestAttemptContent)
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
  var millisecondsSince1970: Int {
    return Int((self.timeIntervalSince1970 * 1000.0).rounded())
  }
  
  init(milliseconds: Int) {
    self = Date(timeIntervalSince1970: TimeInterval(milliseconds) / 1000)
  }
}
