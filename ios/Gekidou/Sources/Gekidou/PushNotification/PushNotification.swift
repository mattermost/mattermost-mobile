import Foundation
import UserNotifications

public class PushNotification: NSObject {
    @objc public static let `default` = PushNotification()
    let fibonacciBackoffsInSeconds = [1.0, 2.0, 3.0, 5.0, 8.0]
    // Track retry count per notification (keyed by ack_id) instead of globally
    private var retryIndices: [String: Int] = [:]
    private let retryLock = NSLock()
    let queue = OperationQueue()

    public override init() {
        queue.maxConcurrentOperationCount = 1
    }

    // Thread-safe retry index access per notification
    private func getAndIncrementRetryIndex(for ackId: String) -> Int {
        retryLock.lock()
        defer { retryLock.unlock() }
        let current = retryIndices[ackId] ?? 0
        retryIndices[ackId] = current + 1
        return current
    }

    private func getCurrentRetryIndex(for ackId: String) -> Int {
        retryLock.lock()
        defer { retryLock.unlock() }
        return retryIndices[ackId] ?? 0
    }

    private func clearRetryIndex(for ackId: String) {
        retryLock.lock()
        defer { retryLock.unlock() }
        retryIndices.removeValue(forKey: ackId)
    }
    
    @objc public func postNotificationReceipt(_ userInfo: [AnyHashable:Any]) {
        let notification = UNMutableNotificationContent()
        notification.userInfo = userInfo
        postNotificationReceipt(notification, completionHandler: {_ in})
    }
    
    public func postNotificationReceipt(_ notification: UNMutableNotificationContent, completionHandler: @escaping (_ notification: UNMutableNotificationContent?) -> Void) {
        guard let jsonData = try? JSONSerialization.data(withJSONObject: notification.userInfo) else {
            GekidouLogger.shared.log(.error, "Gekidou PushNotification: Failed to serialize notification userInfo to JSON")
            completionHandler(nil)
            return
        }

        do {
            let ackNotification = try JSONDecoder().decode(AckNotification.self, from: jsonData)
            postNotificationReceiptWithRetry(ackNotification) { data in
                GekidouLogger.shared.log(.info, "Gekidou PushNotification: process receipt response for serverUrl %{public}@", ackNotification.serverUrl)

                guard let data = data else {
                    GekidouLogger.shared.log(.info, "Gekidou PushNotification: process receipt response for serverUrl %{public}@ does not contain data", ackNotification.serverUrl)
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
        } catch {
            GekidouLogger.shared.log(.error, "Gekidou PushNotification: Failed to decode AckNotification - %{public}@", String(describing: error))
            completionHandler(nil)
        }
    }
    
    private func postNotificationReceiptWithRetry(_ ackNotification: AckNotification, completionHandler: @escaping (_ data: Data?) -> Void) {
        let ackId = ackNotification.id
        let currentRetryIndex = getCurrentRetryIndex(for: ackId)
        if (currentRetryIndex >= self.fibonacciBackoffsInSeconds.count) {
          GekidouLogger.shared.log(.info, "Gekidou PushNotification: max retries reached for notification %{public}@", ackId)
            clearRetryIndex(for: ackId)
            completionHandler(nil)
          return
        }

        do {
            let jsonData = try JSONEncoder().encode(ackNotification)
            let headers = ["Content-Type": "application/json; charset=utf-8"]
            let endpoint = "/notifications/ack"
            guard let url = Network.default.buildApiUrl(ackNotification.serverUrl, endpoint) else {
                GekidouLogger.shared.log(.error, "Gekidou PushNotification: Failed to build API URL for server %{public}@", ackNotification.serverUrl)
                completionHandler(nil)
                return
            }
            Network.default.request(
                url, withMethod: "POST", withBody: jsonData,
                andHeaders: headers, forServerUrl: ackNotification.serverUrl) {[weak self] data, response, error in
                    guard let self = self else {
                        completionHandler(nil)
                        return
                    }

                    if error != nil && ackNotification.isIdLoaded,
                       let nsError = error as? NSError,
                       nsError.code != NSURLErrorCancelled {
                        let retryIndex = self.getAndIncrementRetryIndex(for: ackNotification.id)
                        if retryIndex < self.fibonacciBackoffsInSeconds.count {
                            let backoffInSeconds = self.fibonacciBackoffsInSeconds[retryIndex]

                            DispatchQueue.global(qos: .default).asyncAfter(deadline: .now() + backoffInSeconds, execute: {[weak self] in
                                GekidouLogger.shared.log(.info, "Gekidou PushNotification: receipt retrieval failed for %{public}@. Retry %{public}@", ackNotification.id, String(retryIndex))
                                self?.postNotificationReceiptWithRetry(ackNotification, completionHandler: completionHandler)
                            })
                            return
                        } else {
                            self.clearRetryIndex(for: ackNotification.id)
                        }
                    } else {
                        self.clearRetryIndex(for: ackNotification.id)
                    }

                    completionHandler(data)
                }
        } catch {
            GekidouLogger.shared.log(.info, "Gekidou PushNotification: receipt failed %{public}@", error.localizedDescription)
            completionHandler(nil)
        }
    }
    
    private func parseIdLoadedNotification(_ data: Data?) -> [AnyHashable:Any]? {
        guard let data = data else { return nil }

        do {
            guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                GekidouLogger.shared.log(.error, "Gekidou PushNotification: Parsed JSON is not a dictionary")
                return nil
            }
            GekidouLogger.shared.log(.info, "Gekidou PushNotification: parsed json response")
            var userInfo = [AnyHashable:Any]()
            let userInfoKeys = ["channel_name", "team_id", "sender_id", "sender_name", "root_id", "override_username", "override_icon_url", "from_webhook", "message"]
            for key in userInfoKeys {
              if let value = json[key] as? String {
                  userInfo[key] = value
              }
            }
            
            return userInfo
        } catch {
            GekidouLogger.shared.log(.error, "Gekidou PushNotification: Failed to parse notification JSON - %{public}@", String(describing: error))
            return nil
        }
    }
}
