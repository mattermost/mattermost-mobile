// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Foundation

extension CallsBridge {
    enum Event: String, CaseIterable {
        case VoIPTokenUpdated
        case IncomingCall
        case CallAnswered
        case CallDeclined
        case CallEnded
        case CallMuted
    }

    @objc
    public static var supportedEvents: [String] {
        return Event.allCases.map(\.rawValue)
    }
}
