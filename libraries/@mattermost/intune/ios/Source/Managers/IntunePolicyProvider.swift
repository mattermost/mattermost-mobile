// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Foundation
import IntuneMAMSwift

// MARK: - Policy Provider

/// Handles querying Intune MAM policies from the SDK
class IntunePolicyProvider {

    // MARK: - Public API

    /// Check if an account (OID) is managed by Intune
    func isManagedAccount(_ oid: String) -> Bool {
        let policyManager = IntuneMAMPolicyManager.instance()
        return policyManager.isAccountIdManaged(oid)
    }

    /// Get full policy dictionary for an account
    func getPolicy(forAccountId oid: String) -> [String: Any]? {
        let policyManager = IntuneMAMPolicyManager.instance()
        guard let policy = policyManager.policy(forAccountId: oid) else {
            return nil
        }

        // Query save/open locations - returns NSDictionary<NSNumber, NSNumber>
        let saveLocationDict = policy.getSaveToLocations(forAccountId: oid) as NSDictionary
        let openLocationDict = policy.getOpenFromLocations(forAccountId: oid) as NSDictionary

        // Calculate bitmask values by iterating over dictionaries
        var allowedSaveLocations: Int = 0
        var allowedOpenLocations: Int = 0

        // Iterate over save locations dictionary
        for (locationKey, allowedValue) in saveLocationDict {
            // Cast from Any to NSNumber - required because NSDictionary iteration uses Any
            guard let locNum = locationKey as? NSNumber,
                  let allowedNum = allowedValue as? NSNumber,
                  allowedNum.boolValue else {
                continue
            }
            allowedSaveLocations |= locNum.intValue
        }

        // Iterate over open locations dictionary
        for (locationKey, allowedValue) in openLocationDict {
            // Cast from Any to NSNumber - required because NSDictionary iteration uses Any
            guard let locNum = locationKey as? NSNumber,
                  let allowedNum = allowedValue as? NSNumber,
                  allowedNum.boolValue else {
                continue
            }
            allowedOpenLocations |= locNum.intValue
        }

        return [
            "isPINRequired": policy.isPINRequired,
            "isContactSyncAllowed": policy.isContactSyncAllowed,
            "isWidgetContentSyncAllowed": policy.isWidgetContentSyncAllowed,
            "isSpotlightIndexingAllowed": policy.isSpotlightIndexingAllowed,
            "areSiriIntentsAllowed": policy.areSiriIntentsAllowed,
            "areAppIntentsAllowed": policy.areAppIntentsAllowed,
            "isAppSharingAllowed": policy.isAppSharingAllowed,
            "shouldFileProviderEncryptFiles": policy.shouldFileProviderEncryptFiles,
            "isManagedBrowserRequired": policy.isManagedBrowserRequired,
            "isFileEncryptionRequired": policy.isFileEncryptionRequired,
            "isScreenCaptureAllowed": policy.isScreenCaptureAllowed,
            "notificationPolicy": policy.notificationPolicy.rawValue,
            "allowedSaveLocations": allowedSaveLocations,
            "allowedOpenLocations": allowedOpenLocations
        ]
    }

    /// Check if screen capture is allowed for an account
    func isScreenCaptureAllowed(forAccountId oid: String) -> Bool {
        let policyManager = IntuneMAMPolicyManager.instance()
        guard let policy = policyManager.policy(forAccountId: oid) else {
            return true // No policy = allow
        }
        return policy.isScreenCaptureAllowed
    }

    /// Check if saving to a specific location is allowed for an account
    func canSaveToLocation(_ location: Int, oid: String) -> Bool {
        let policyManager = IntuneMAMPolicyManager.instance()
        guard let policy = policyManager.policy(forAccountId: oid) else {
            return true // No policy = allow
        }

        // Create IntuneMAMSaveLocation enum from raw value (Int not UInt)
        guard let saveLocation = IntuneMAMSaveLocation(rawValue: location) else {
            return false
        }

        // Use correct method signature: isSaveToAllowedForLocation:withAccountId:
        return policy.isSaveToAllowed(for: saveLocation, withAccountId: oid)
    }

    /// Set the current UI policy identity for the app
    func setCurrentIdentity(oid: String?, completion: @escaping (Bool) -> Void) {
        let policyManager = IntuneMAMPolicyManager.instance()

        if let oid = oid {
            policyManager.setUIPolicyAccountId(oid) { result in
                completion(result == .success)
            }
        } else {
            policyManager.setUIPolicyAccountId("")
            completion(true)
        }
    }
}
