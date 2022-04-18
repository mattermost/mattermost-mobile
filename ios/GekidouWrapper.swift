//
//  GekidouWrapper.swift
//  Mattermost
//
//  Created by Elias Nahum on 06-04-22.
//  Copyright © 2022 Facebook. All rights reserved.
//

import Foundation
import Gekidou

@objc class GekidouWrapper: NSObject {
  @objc public static let `default` = GekidouWrapper()

  @objc func postNotificationReceipt(_ userInfo: [AnyHashable:Any]) {
    Network.default.postNotificationReceipt(userInfo)
  }
}
