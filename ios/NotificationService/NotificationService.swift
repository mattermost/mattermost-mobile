import UserNotifications
import UploadAttachments

class NotificationService: UNNotificationServiceExtension {
  
  var contentHandler: ((UNNotificationContent) -> Void)?
  var bestAttemptContent: UNMutableNotificationContent?

  var retryIndex = 0
  
  override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
    self.contentHandler = contentHandler

    let fibonacciBackoffsInSeconds = [1.0, 2.0, 3.0, 5.0, 8.0]

    func fetchReceipt(notificationId: String, receivedAt: Int, type: String, postId: String, idLoaded: Bool ) -> Void {
      if (self.retryIndex >= fibonacciBackoffsInSeconds.count) {
        contentHandler(self.bestAttemptContent!)
        return
      }

      UploadSession.shared.notificationReceipt(
        notificationId: notificationId,
        receivedAt: receivedAt,
        type: type,
        postId: postId,
        idLoaded: idLoaded) { data, response, error in
          if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode != 200 {
            contentHandler(self.bestAttemptContent!)
            return
          }

          guard let data = data, error == nil else {
            if (idLoaded) {
              // Receipt retrieval failed. Kick off retries.
              let backoffInSeconds = fibonacciBackoffsInSeconds[self.retryIndex]

              DispatchQueue.main.asyncAfter(deadline: .now() + backoffInSeconds, execute: {
                fetchReceipt(
                  notificationId: notificationId,
                  receivedAt: Date().millisecondsSince1970,
                  type: type,
                  postId: postId,
                  idLoaded: idLoaded
                )
              })
 
              self.retryIndex += 1
            }
            return
          }
          self.processResponse(data: data, bestAttemptContent: self.bestAttemptContent!, contentHandler: contentHandler)
        }
    }

    bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)
    if let bestAttemptContent = bestAttemptContent {
      let ackId = (bestAttemptContent.userInfo["ack_id"] ?? "") as! String
      let type = (bestAttemptContent.userInfo["type"] ?? "") as! String
      let postId = (bestAttemptContent.userInfo["post_id"] ?? "") as! String
      let idLoaded = (bestAttemptContent.userInfo["id_loaded"] ?? false) as! Bool

      fetchReceipt(
        notificationId: ackId,
        receivedAt: Date().millisecondsSince1970,
        type: type,
        postId: postId,
        idLoaded: idLoaded
      )
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
