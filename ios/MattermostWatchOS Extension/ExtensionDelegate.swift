//
//  ExtensionDelegate.swift
//  Mattermost
//
// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
//

import UserNotifications
import WatchConnectivity
import WatchKit

class ExtensionDelegate: NSObject, UNUserNotificationCenterDelegate, WKExtensionDelegate, WCSessionDelegate {
  var client = Client(dispatchQueue: DispatchQueue.main)

  func applicationDidFinishLaunching() {
    let defaults = UserDefaults.standard
    let url = defaults.string(forKey: "MattermostURL")
    let token = defaults.string(forKey: "MattermostToken")
    if url != nil && token != nil {
      client.setCredentials(url: url!, token: token!)
    }
    _ = self.client.watchCredentials {
      defaults.set(self.client.url, forKey: "MattermostURL")
      defaults.set(self.client.token, forKey: "MattermostToken")
      defaults.synchronize()
    }
    
    UNUserNotificationCenter.current().delegate = self
  }

  func applicationDidBecomeActive() {
    WCSession.default.delegate = self
    WCSession.default.activate()
  }

  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    if (error != nil) {
      NSLog("%@", error!.localizedDescription)
    }
  }

  func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {
    if let credentials = message["credentials"] {
      DispatchQueue.main.async {
        let dict = credentials as! [String : Any]
        self.client.setCredentials(url: dict["url"] as! String, token: dict["token"] as! String)
      }
    }
  }
  
  func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
    completionHandler()
    
    if response.actionIdentifier == UNNotificationDefaultActionIdentifier {
      let data = response.notification.request.content.userInfo
      if let postId = data["post_id"] as? String,
        let channelId = data["channel_id"] as? String
      {
        let teamId = data["team_id"] as? String
        self.show(post: postId, forChannel: channelId, forTeam: teamId)
      }
    }
  }
  
  func show(post: String, forChannel channel: String, forTeam team: String?) {
    if let root = WKExtension.shared().rootInterfaceController as? ServerController {
      root.popToRootController()
      if team != nil {
        let teamContext = TeamContext(teamId: team!)
        root.pushController(withName: "TeamController", context: teamContext)
      }
      let channelContext = ChannelContext(teamId: team, channelId: channel)
      root.pushController(withName: "ChannelController", context: channelContext)
      let threadContext = ThreadContext(postId: post)
      root.pushController(withName: "ThreadController", context: threadContext)
    }
  }
}
