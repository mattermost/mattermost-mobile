//
//  ExtensionDelegate.swift
//  Mattermost
//
// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
//

import WatchConnectivity
import WatchKit

class ExtensionDelegate: NSObject, WKExtensionDelegate, WCSessionDelegate {
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
}
