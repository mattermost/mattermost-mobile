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
import TurboLogIOSNative

@objc class GekidouWrapper: NSObject {
  @objc public static let `default` = GekidouWrapper()

  override init() {
    super.init()
    ScreenCaptureManager.startTrackingScreens()
    registerDraftUpdateObserver()
  }

  @objc func configureTurboLogForGekidou() {
    GekidouLogger.shared.setLogHandler { level, message in
      let turboLevel: TurboLogIOSNative.TurboLogLevel
      switch level {
      case .debug:
        turboLevel = .debug
      case .info:
        turboLevel = .info
      case .warning:
        turboLevel = .warning
      case .error:
        turboLevel = .error
      }

      TurboLogIOSNative.TurboLogger.write(level: turboLevel, message: message)
    }
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
    if let credentials = try? Keychain.default.getCredentials(for: url) {
      return credentials?.token
    }

    return nil
  }
  
  private func registerDraftUpdateObserver() {
    CFNotificationCenterAddObserver(
        CFNotificationCenterGetDarwinNotifyCenter(),
        nil,
        { _, _, _, _, _ in
            if let payload = Preferences.default.object(forKey: "ShareExtensionDraftUpdate") as? [String: Any] {
              DispatchQueue.main.async {
                if let bridge = RCTBridge.current(),
                   let module = bridge.module(for: MattermostShare.self) as? MattermostShare {
                  module.sendDraftUpdate(payload)
                }
              }
              Preferences.default.removeObject(forKey: "ShareExtensionDraftUpdate")
            }
        },
        "share.extension.draftUpdate" as CFString,
        nil,
        .deliverImmediately
    )
  }
}
