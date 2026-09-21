// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Foundation

@objc public protocol CallsBridgeDelegate {
    func sendEventWithName(_ name: String, body: [String: Any]?)
}
