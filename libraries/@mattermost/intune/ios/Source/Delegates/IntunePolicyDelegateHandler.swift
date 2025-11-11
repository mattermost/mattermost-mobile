// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Foundation
import IntuneMAMSwift
import Gekidou

// MARK: - IntuneMAMPolicyDelegate

extension IntuneDelegateHandler: IntuneMAMPolicyDelegate {
    public func wipeData(forAccountId accountId: String) -> Bool {
        logger.log(.warning, "[Intune] Selective wipe requested for OID: %@", sanitizeOID(accountId))

        // Notify JS to handle wipe (works even if app was closed and relaunched)
        manager.sendEvent(name: IntuneEnrollmentManager.Event.IntuneWipeRequested.rawValue, body: [
            "oid": accountId,
            "serverUrls": manager.getServerUrlsForOID(accountId)
        ])

        return true // Acknowledge wipe to SDK
    }

    public func identitySwitchRequired(
        forAccountId accountId: String,
        reason: IntuneMAMIdentitySwitchReason,
        completionHandler: @escaping (IntuneMAMSwitchIdentityResult) -> Void
    ) {
        let reasonString: String
        switch reason {
        case .openURL:
            reasonString = "open_url"
        case .cancelConditionalLaunch:
            reasonString = "cancel_conditional_launch"
        case .documentImport:
            reasonString = "document_import"
        @unknown default:
            reasonString = "unknown"
        }

        logger.log(.info, "[Intune] Identity switch required for OID: %@, reason: %@", sanitizeOID(accountId), reasonString)

        let serverUrls = manager.getServerUrlsForOID(accountId)

        // Notify JS layer about identity switch requirement
        manager.sendEvent(name: IntuneEnrollmentManager.Event.IntuneIdentitySwitchRequired.rawValue, body: [
            "oid": accountId,
            "reason": reasonString,
            "serverUrls": serverUrls
        ])

        // Allow the switch (JS can handle UI updates if needed)
        completionHandler(.success)
    }

    public func blockAccountId(
        _ accountId: String,
        reason: IntuneMAMBlockAccountReason,
        completionHandler: @escaping (IntuneMAMBlockAccountResult) -> Void
    ) {
        logger.log(.warning, "[Intune] Conditional launch blocked for OID: %@, reason: %d", sanitizeOID(accountId), reason.rawValue)

        // Notify JS to show locked state
        manager.sendEvent(name: IntuneEnrollmentManager.Event.IntuneConditionalLaunchBlocked.rawValue, body: [
            "oid": accountId,
            "reason": Int(reason.rawValue),
            "serverUrls": manager.getServerUrlsForOID(accountId)
        ])

        completionHandler(.success) // Block account from UI
    }

    public func restartApplication() -> Bool {
        logger.log(.info, "[Intune] App restart requested by SDK")
        // Return false to let SDK handle the restart (policy received for first time or MAM-CA remediation)
        return false
    }

    public func addAccountId(_ accountId: String, completionHandler: @escaping (IntuneMAMAddIdentityResult) -> Void) {
        logger.log(.info, "[Intune] Add account requested for OID: %@", sanitizeOID(accountId))

        // Check if we have this account in keychain (from any server)
        let serverUrls = manager.getServerUrlsForOID(accountId)

        if !serverUrls.isEmpty {
            // Account exists, allow addition
            logger.log(.info, "[Intune] Account found in keychain for %d server(s)", serverUrls.count)
            completionHandler(.success)
        } else {
            // Account not found, notify JS to handle enrollment
            logger.log(.info, "[Intune] Account not found, notifying JS")
            manager.sendEvent(name: IntuneEnrollmentManager.Event.IntuneAuthRequired.rawValue, body: [
                "oid": accountId,
                "serverUrls": [] // Empty since account not yet enrolled
            ])
            completionHandler(.success) // Still allow, JS will handle enrollment flow
        }
    }
}
