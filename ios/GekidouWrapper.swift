//
//  GekidouWrapper.swift
//  Mattermost
//
//  Created by Elias Nahum on 06-04-22.
//  Copyright © 2022 Facebook. All rights reserved.
//

import Foundation
import Gekidou
import react_native_emm

@objc class GekidouWrapper: NSObject {
  @objc public static let `default` = GekidouWrapper()
  
  override init() {
    ScreenCaptureManager.startTrackingScreens()
  }

  @objc func postNotificationReceipt(_ userInfo: [AnyHashable:Any]) {
    PushNotification.default.postNotificationReceipt(userInfo)
  }
  
  @objc func fetchDataForPushNotification(_ notification: [AnyHashable:Any], withContentHandler contentHander: @escaping ((_ data: Data?) -> Void)) {
    PushNotification.default.fetchDataForPushNotification(notification, withContentHandler: { data in
      let jsonData = try? JSONEncoder().encode(data)
      contentHander(jsonData)
    })
  }
  
  @objc func verifySignature(_ notification: [AnyHashable:Any]) -> Bool {
    return PushNotification.default.verifySignature(notification)
  }
  
  @objc func attachSession(_ id: String, completionHandler: @escaping () -> Void) {
    let shareExtension = ShareExtension()
    shareExtension.attachSession(
      id: id,
      completionHandler: completionHandler
    )
  }
  
  @objc func setPreference(_ value: Any?, forKey name: String) {
    Preferences.default.set(value, forKey: name)
  }
  
  @objc func getToken(for url: String) -> String? {
    if let token = try? Keychain.default.getToken(for: url) {
      return token
    }
    
    return nil
  }
}
