//
//  AuthenticationController.swift
//  Mattermost
//
// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
//

import WatchKit
import Foundation

class AuthenticationController: WKInterfaceController {
  var credentialsWatcher: Int64?

  override func willActivate() {
    super.willActivate()
    let client = (WKExtension.shared().delegate as! ExtensionDelegate).client
    self.credentialsWatcher = client.watchCredentials {
      self.checkCredentials()
    }
  }

  override func didDeactivate() {
    if self.credentialsWatcher != nil {
      let client = (WKExtension.shared().delegate as! ExtensionDelegate).client
      client.stopWatching(self.credentialsWatcher!)
    }
    super.didDeactivate()
  }
  
  func checkCredentials() {
    let client = (WKExtension.shared().delegate as! ExtensionDelegate).client
    if client.hasCredentials() {
      WKInterfaceController.reloadRootControllers(withNamesAndContexts: [(name: "TeamsController", context: 0 as AnyObject)])
    }
  }
}
