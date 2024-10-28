import Foundation
import UserNotifications
import UIKit
import React

@objc public class NotificationManager: NSObject {
    @objc public static let shared = NotificationManager()
    private let notificationCenter = UNUserNotificationCenter.current()
    
    private override init() {}

    func RCTNullIfNil<T>(_ value: T?) -> Any {
        return value ?? NSNull()
    }

    func RCTNilIfNull<T>(_ value: T?) -> T? {
        guard let t = value else { return nil }
        return t as AnyObject === NSNull() ? nil : t
    }
    
    func UNNotificationPayload(notification: UNNotification) -> NSDictionary {
        var formattedNotification = NSMutableDictionary()
        let content = notification.request.content
        
        formattedNotification["identifier"] = notification.request.identifier
        
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZZZZZ"
        let dateString = formatter.string(from: notification.date)
        formattedNotification["date"] = dateString
        
        formattedNotification["title"] = RCTNullIfNil(content.title)
        formattedNotification["body"] = RCTNullIfNil(content.body)
        formattedNotification["category"] = RCTNullIfNil(content.categoryIdentifier)
        formattedNotification["thread"] = RCTNullIfNil(content.threadIdentifier)
        
        if let userInfo = RCTNullIfNil(RCTJSONClean(content.userInfo)) as? [AnyHashable: Any] {
            formattedNotification.addEntries(from: userInfo)
        }
        
        return formattedNotification
    }
    
    
    @objc public func getDeliveredNotifications(completionHandler: @escaping ([NSDictionary]) -> Void) {
        notificationCenter.getDeliveredNotifications { [weak self] notifications in
            var formattedNotifications: [NSDictionary] = []
            for notification in notifications {
                if let wkSelf = self {
                    formattedNotifications.append(wkSelf.UNNotificationPayload(notification: notification))
                }
            }
            completionHandler(formattedNotifications)
        }
    }
    
    @objc public func removeChannelNotifications(serverUrl: String, channelId: String) {
        notificationCenter.getDeliveredNotifications(completionHandler: {notifications in
            var notificationIds = [String]()
            
            for notification in notifications {
                let request = notification.request
                let content = request.content
                let identifier = request.identifier
                let cId = content.userInfo["channel_id"] as? String
                let rootId = content.userInfo["root_id"] as? String ?? ""
                let crtEnabled = content.userInfo["is_crt_enabled"] as? Bool ?? false
                let skipThreadNotification = !rootId.isEmpty && crtEnabled
                
                if cId == channelId && !skipThreadNotification {
                    notificationIds.append(identifier)
                }
            }
            
            self.notificationCenter.removeDeliveredNotifications(withIdentifiers: notificationIds)
        })
    }
    
    @objc public func removeThreadNotifications(serverUrl: String, threadId: String) {
        notificationCenter.getDeliveredNotifications(completionHandler: {notifications in
            var notificationIds = [String]()
            
            for notification in notifications {
                let request = notification.request
                let content = request.content
                let identifier = request.identifier
                let postId = content.userInfo["post_id"] as? String
                let rootId = content.userInfo["root_id"] as? String
                
                if rootId == threadId || postId == threadId {
                    notificationIds.append(identifier)
                }
            }
            
            self.notificationCenter.removeDeliveredNotifications(withIdentifiers: notificationIds)
        })
    }
    
    @objc public func removeServerNotifications(serverUrl: String) {
        notificationCenter.getDeliveredNotifications(completionHandler: {notifications in
            var notificationIds = [String]()
            
            for notification in notifications {
                let request = notification.request
                let content = request.content
                let identifier = request.identifier
                let url = content.userInfo["server_url"] as? String
                
                if url == serverUrl {
                    notificationIds.append(identifier)
                }
            }
            
            self.notificationCenter.removeDeliveredNotifications(withIdentifiers: notificationIds)
        })
    }
}
