// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Foundation
import IntuneMAMSwift
import Gekidou

// MARK: - IntuneMAMEnrollmentDelegate

extension IntuneDelegateHandler: IntuneMAMEnrollmentDelegate {
    public func enrollmentRequest(with status: IntuneMAMEnrollmentStatus) {
        let domain = extractDomain(from: status.identity)

        if status.didSucceed {
            switch Int(status.statusCode.rawValue) {
            case 100: // NewPoliciesReceived
                logger.log(.info, "[Intune] Enrollment succeeded for domain: %@", domain)
                manager.sendEvent(name: IntuneEnrollmentManager.Event.IntuneEnrollmentChanged.rawValue, body: [
                    "enrolled": true,
                    "reason": "success",
                    "oid": status.accountId,
                    "serverUrls": manager.getServerUrlsForOID(status.accountId)
                ])
            case 101: // PoliciesNotChanged
                logger.log(.info, "[Intune] Policy refresh (no changes) for domain: %@", domain)
            case 102: // WipeReceived
                logger.log(.warning, "[Intune] Wipe received during policy refresh for domain: %@", domain)
                manager.sendEvent(name: IntuneEnrollmentManager.Event.IntuneWipeRequested.rawValue, body: [
                    "oid": status.accountId,
                    "serverUrls": manager.getServerUrlsForOID(status.accountId)
                ])
            case 103: // NoPolicyReceived
                logger.log(.info, "[Intune] Not targeted for domain: %@", domain)
                manager.sendEvent(name: IntuneEnrollmentManager.Event.IntuneEnrollmentChanged.rawValue, body: [
                    "enrolled": false,
                    "reason": "not_targeted",
                    "oid": status.accountId,
                    "serverUrls": manager.getServerUrlsForOID(status.accountId)
                ])
            default:
                break
            }
        } else {
            switch Int(status.statusCode.rawValue) {
            case 200: // AccountNotLicensed
                logger.log(.warning, "[Intune] Not licensed for domain: %@", domain)
                manager.sendEvent(name: IntuneEnrollmentManager.Event.IntuneEnrollmentChanged.rawValue, body: [
                    "enrolled": false,
                    "reason": "not_licensed",
                    "oid": status.accountId,
                    "serverUrls": manager.getServerUrlsForOID(status.accountId)
                ])
            case 203: // AuthRequired
                logger.log(.warning, "[Intune] Auth refresh required for domain: %@", domain)
                Task { @MainActor in
                    do {
                        try await manager.refreshMSALToken(for: status.accountId)
                    } catch {
                        logger.log(.error, "[Intune] Token refresh failed")
                        let serverUrls = manager.getServerUrlsForOID(status.accountId)
                        manager.sendEvent(name: IntuneEnrollmentManager.Event.IntuneAuthRequired.rawValue, body: [
                            "oid": status.accountId,
                            "serverUrls": serverUrls
                        ])
                    }
                }
            case 209: // AccountRemovedByUser
                logger.log(.warning, "[Intune] Account removed by user for domain: %@", domain)
                manager.sendEvent(name: IntuneEnrollmentManager.Event.IntuneEnrollmentChanged.rawValue, body: [
                    "enrolled": false,
                    "reason": "account_removed_by_user",
                    "oid": status.accountId,
                    "serverUrls": manager.getServerUrlsForOID(status.accountId)
                ])
            case 210: // AccountRemovedFromDevice
                logger.log(.warning, "[Intune] Account removed from device for domain: %@", domain)
                manager.sendEvent(name: IntuneEnrollmentManager.Event.IntuneEnrollmentChanged.rawValue, body: [
                    "enrolled": false,
                    "reason": "account_removed_from_device",
                    "oid": status.accountId,
                    "serverUrls": manager.getServerUrlsForOID(status.accountId)
                ])
            case 211: // AccountRemovedByServerSideWipe
                logger.log(.warning, "[Intune] Account removed by server wipe for domain: %@", domain)
                manager.sendEvent(name: IntuneEnrollmentManager.Event.IntuneEnrollmentChanged.rawValue, body: [
                    "enrolled": false,
                    "reason": "account_removed_by_wipe",
                    "oid": status.accountId,
                    "serverUrls": manager.getServerUrlsForOID(status.accountId)
                ])
            case 220: // PolicyRecordGone
                logger.log(.warning, "[Intune] Policy record gone for domain: %@", domain)
                manager.sendEvent(name: IntuneEnrollmentManager.Event.IntuneEnrollmentChanged.rawValue, body: [
                    "enrolled": false,
                    "reason": "policy_record_gone",
                    "oid": status.accountId,
                    "serverUrls": manager.getServerUrlsForOID(status.accountId)
                ])
            case 225: // LicensedNotTargeted
                logger.log(.warning, "[Intune] Licensed but not targeted for domain: %@", domain)
                manager.sendEvent(name: IntuneEnrollmentManager.Event.IntuneEnrollmentChanged.rawValue, body: [
                    "enrolled": false,
                    "reason": "licensed_not_targeted",
                    "oid": status.accountId,
                    "serverUrls": manager.getServerUrlsForOID(status.accountId)
                ])
            default:
                logger.log(.error, "[Intune] Enrollment failed with code: %d for domain: %@",
                          Int(status.statusCode.rawValue), domain)
                manager.sendEvent(name: IntuneEnrollmentManager.Event.IntuneEnrollmentChanged.rawValue, body: [
                    "enrolled": false,
                    "reason": "failed",
                    "oid": status.accountId,
                    "serverUrls": manager.getServerUrlsForOID(status.accountId)
                ])
            }
        }
    }

    public func enrollmentRequest(with status: IntuneMAMEnrollmentStatus, andRefreshedPolicies refreshedPolicies: Bool) {
        let domain = extractDomain(from: status.identity)

        if status.didSucceed {
            switch Int(status.statusCode.rawValue) {
            case 100: // NewPoliciesReceived
                logger.log(.info, "[Intune] Policy refresh succeeded for domain: %@", domain)
                let policy = manager.getPolicy(forAccountId: status.accountId)
                manager.sendEvent(name: IntuneEnrollmentManager.Event.IntunePolicyChanged.rawValue, body: [
                    "oid": status.accountId,
                    "changed": true,
                    "policy": policy as Any,
                    "serverUrls": manager.getServerUrlsForOID(status.accountId)
                ])
            case 101: // PoliciesNotChanged
                logger.log(.info, "[Intune] Policy refresh (no changes) for domain: %@", domain)
            case 102: // WipeReceived
                logger.log(.warning, "[Intune] Wipe received during policy refresh for domain: %@", domain)
                manager.sendEvent(name: IntuneEnrollmentManager.Event.IntuneWipeRequested.rawValue, body: [
                    "oid": status.accountId,
                    "serverUrls": manager.getServerUrlsForOID(status.accountId)
                ])
            default:
                break
            }
        } else {
            switch Int(status.statusCode.rawValue) {
            case 203: // AuthRequired
                logger.log(.warning, "[Intune] Auth refresh required during policy refresh for domain: %@", domain)
                Task { @MainActor in
                    do {
                        try await manager.refreshMSALToken(for: status.accountId)
                    } catch {
                        logger.log(.error, "[Intune] Token refresh failed")
                        let serverUrls = manager.getServerUrlsForOID(status.accountId)
                        manager.sendEvent(name: IntuneEnrollmentManager.Event.IntuneAuthRequired.rawValue, body: [
                            "oid": status.accountId,
                            "serverUrls": serverUrls
                        ])
                    }
                }
            case 220: // PolicyRecordGone
                logger.log(.warning, "[Intune] Policy record gone during refresh for domain: %@", domain)
                manager.sendEvent(name: IntuneEnrollmentManager.Event.IntunePolicyChanged.rawValue, body: [
                    "oid": status.accountId,
                    "changed": true,
                    "removed": true,
                    "policy": NSNull(),
                    "serverUrls": manager.getServerUrlsForOID(status.accountId)
                ])
            default:
                logger.log(.warning, "[Intune] Policy refresh failed with code: %d for domain: %@",
                          Int(status.statusCode.rawValue), domain)
            }
        }
    }

    public func unenrollRequest(with status: IntuneMAMEnrollmentStatus) {
        let domain = extractDomain(from: status.identity)

        if status.didSucceed {
            logger.log(.info, "[Intune] Unenrollment succeeded for domain: %@", domain)
            manager.sendEvent(name: IntuneEnrollmentManager.Event.IntuneEnrollmentChanged.rawValue, body: [
                "enrolled": false,
                "reason": "unenrolled",
                "oid": status.accountId,
                "serverUrls": manager.getServerUrlsForOID(status.accountId)
            ])
        } else {
            logger.log(.error, "[Intune] Unenrollment failed for domain: %@", domain)
            manager.sendEvent(name: IntuneEnrollmentManager.Event.IntuneEnrollmentChanged.rawValue, body: [
                "enrolled": true,
                "reason": "unenroll_failed",
                "oid": status.accountId,
                "serverUrls": manager.getServerUrlsForOID(status.accountId)
            ])
        }
    }
}
