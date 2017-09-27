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
  var credentialWatcher: Int64?

  override func willActivate() {
    super.willActivate()
    let client = (WKExtension.shared().delegate as! ExtensionDelegate).client
    self.credentialWatcher = client.watchCredentials(self.checkCredentials)
  }

  override func didDeactivate() {
    let client = (WKExtension.shared().delegate as! ExtensionDelegate).client
    client.stopWatching(self.credentialWatcher!)

    super.didDeactivate()
  }
  
  func checkCredentials() {
    let client = (WKExtension.shared().delegate as! ExtensionDelegate).client
    if client.hasCredentials() {
      WKInterfaceController.reloadRootControllers(withNamesAndContexts: [(name: "ServerController", context: 0 as AnyObject)])
    }
  }
}
