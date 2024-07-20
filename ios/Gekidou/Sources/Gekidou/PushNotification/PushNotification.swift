import Foundation
import UserNotifications
import os.log

public class PushNotification: NSObject {
    @objc public static let `default` = PushNotification()
    let fibonacciBackoffsInSeconds = [1.0, 2.0, 3.0, 5.0, 8.0]
    private var retryIndex = 0
    let queue = OperationQueue()
    
    public override init() {
        queue.maxConcurrentOperationCount = 1
    }
    
    @objc public func postNotificationReceipt(_ userInfo: [AnyHashable:Any]) {
        let notification = UNMutableNotificationContent()
        notification.userInfo = userInfo
        postNotificationReceipt(notification, completionHandler: {_ in})
    }
    
    public func postNotificationReceipt(_ notification: UNMutableNotificationContent, completionHandler: @escaping (_ notification: UNMutableNotificationContent?) -> Void) {
        if let jsonData = try? JSONSerialization.data(withJSONObject: notification.userInfo),
           let ackNotification = try? JSONDecoder().decode(AckNotification.self, from: jsonData) {
            postNotificationReceiptWithRetry(ackNotification) { data in
                os_log(
                    OSLogType.default,
                    "Mattermost Notifications: process receipt response for serverUrl %{public}@",
                    ackNotification.serverUrl
                )
                
                guard let data = data else {
                    os_log(
                        OSLogType.default,
                        "Mattermost Notifications: process receipt response for serverUrl %{public}@ does not contain data",
                        ackNotification.serverUrl
                    )
                    completionHandler(nil)
                    return
                }
                notification.userInfo["server_url"] = ackNotification.serverUrl
                if let idLoadedNotification = self.parseIdLoadedNotification(data) {
                    if let body = idLoadedNotification["message"] as? String {
                        notification.body = body
                    }
                    
                    if let title = idLoadedNotification["channel_name"] as? String {
                        notification.title = title
                    }
                    
                    for (key, value) in idLoadedNotification {
                        notification.userInfo[key] = value
                    }
                }
                completionHandler(notification)
            }
            return
        }
        os_log(OSLogType.default, "Mattermost Notifications: Could not parse ACK notification")
        completionHandler(nil)
    }
    
    private func postNotificationReceiptWithRetry(_ ackNotification: AckNotification, completionHandler: @escaping (_ data: Data?) -> Void) {
        if (self.retryIndex >= self.fibonacciBackoffsInSeconds.count) {
          os_log(OSLogType.default, "Mattermost Notifications: max retries reached. Will call sendMessageIntent")
            completionHandler(nil)
          return
        }
        
        do {
            let jsonData = try JSONEncoder().encode(ackNotification)
            let headers = ["Content-Type": "application/json; charset=utf-8"]
            let endpoint = "/notifications/ack"
            let url = Network.default.buildApiUrl(ackNotification.serverUrl, endpoint)
            Network.default.request(
                url, withMethod: "POST", withBody: jsonData,
                andHeaders: headers, forServerUrl: ackNotification.serverUrl) {[weak self] data, response, error in
                    if error != nil && ackNotification.isIdLoaded,
                       let nsError = error as? NSError,
                       let fibonacciBackoffsInSeconds = self?.fibonacciBackoffsInSeconds,
                       let retryIndex = self?.retryIndex,
                       fibonacciBackoffsInSeconds.count > retryIndex {
                        if nsError.code == NSURLErrorCancelled {
                            completionHandler(nil)
                            return
                        }
                        let backoffInSeconds = fibonacciBackoffsInSeconds[retryIndex]
                        self?.retryIndex += 1

                        DispatchQueue.main.asyncAfter(deadline: .now() + backoffInSeconds, execute: {[weak self] in
                            os_log(
                              OSLogType.default,
                              "Mattermost Notifications: receipt retrieval failed. Retry %{public}@",
                              String(retryIndex)
                            )
                            self?.postNotificationReceiptWithRetry(ackNotification, completionHandler: completionHandler)
                        })
                        
                        return
                    }
                    
                    completionHandler(data)
                }
        } catch {
            os_log(OSLogType.default, "Mattermost Notifications: receipt failed %{public}@", error.localizedDescription)
            completionHandler(nil)
        }
    }
    
    private func parseIdLoadedNotification(_ data: Data?) -> [AnyHashable:Any]? {
        if let data = data,
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        {
            os_log(OSLogType.default, "Mattermost Notifications: parsed json response")
            var userInfo = [AnyHashable:Any]()
            let userInfoKeys = ["channel_name", "team_id", "sender_id", "sender_name", "root_id", "override_username", "override_icon_url", "from_webhook", "message"]
            for key in userInfoKeys {
              if let value = json[key] as? String {
                  userInfo[key] = value
              }
            }
            
            return userInfo
        }
        
        return nil
    }
}
