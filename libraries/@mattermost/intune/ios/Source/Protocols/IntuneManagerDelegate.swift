// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Foundation

@objc public protocol IntuneManagerDelegate {
    func sendEvent(name: String, body: [String: Any])
}
