import Foundation
import Gekidou
import UserNotifications
import UIKit

@objc class NotificationHelper: NSObject {
  @objc public static let `default` = NotificationHelper()
  private let notificationCenter = UNUserNotificationCenter.current()
  
  @objc func getDeliveredNotifications(completionHandler: @escaping ([UNNotification]) -> Void) {
    notificationCenter.getDeliveredNotifications(completionHandler: completionHandler)
  }
  
  @objc func clearChannelOrThreadNotifications(userInfo: NSDictionary) {
    let channelId = userInfo["channel_id"] as? String
    let rootId = userInfo["root_id"] as? String ?? ""
    let crtEnabled = userInfo["is_crt_enabled"] as? Bool ?? false
    let skipThreadNotification = rootId.isEmpty && crtEnabled
    
    if skipThreadNotification && channelId != nil {
      removeChannelNotifications(serverUrl: "", channelId: channelId!)
    } else if !rootId.isEmpty {
      removeThreadNotifications(serverUrl: "", threadId: rootId)
    }
  }
  
  @objc func removeChannelNotifications(serverUrl: String, channelId: String) {
    getDeliveredNotifications(completionHandler: {notifications in
      var notificationIds = [String]()

      for notification in notifications {
        let request = notification.request
        let content = request.content
        let identifier = request.identifier
        let cId = content.userInfo["channel_id"] as? String
        let rootId = content.userInfo["root_id"] as? String ?? ""
        let crtEnabled = content.userInfo["is_crt_enabled"] as? Bool ?? false
        let skipThreadNotification = rootId.isEmpty && crtEnabled
        
        if cId == channelId && !skipThreadNotification {
          notificationIds.append(identifier)
        }
      }
      
      self.notificationCenter.removeDeliveredNotifications(withIdentifiers: notificationIds)
      
      // Update the app icon badge here
      // UIApplication.shared.applicationIconBadgeNumber
    })
  }
  
  @objc func removeThreadNotifications(serverUrl: String, threadId: String) {
    getDeliveredNotifications(completionHandler: {notifications in
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
      
      // Update the app icon badge here
      // UIApplication.shared.applicationIconBadgeNumber
    })
  }
  
  @objc func removeServerNotifications(serverUrl: String) {
    getDeliveredNotifications(completionHandler: {notifications in
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
      
      // Update the app icon badge here
      // UIApplication.shared.applicationIconBadgeNumber
    })
  }
}
