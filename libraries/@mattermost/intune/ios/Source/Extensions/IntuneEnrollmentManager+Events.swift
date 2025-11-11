// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Foundation

extension IntuneEnrollmentManager {
    enum Event: String, CaseIterable {
        case IntuneEnrollmentChanged
        case IntunePolicyChanged
        case IntuneWipeRequested
        case IntuneAuthRequired
        case IntuneConditionalLaunchBlocked
        case IntuneIdentitySwitchRequired
    }

    @objc
    public static var supportedEvents: [String] {
        return Event.allCases.map(\.rawValue)
    }
}
