// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Foundation
import IntuneMAMSwift
import Gekidou

// MARK: - Base Delegate Handler

/// Base class for Intune MAM SDK delegate implementations
/// Protocol implementations are in separate extension files:
/// - IntuneEnrollmentDelegateHandler.swift (IntuneMAMEnrollmentDelegate)
/// - IntunePolicyDelegateHandler.swift (IntuneMAMPolicyDelegate)
@objc public class IntuneDelegateHandler: NSObject {
    @objc public static let shared = IntuneDelegateHandler()

    let logger = GekidouLogger.shared
    let manager = IntuneEnrollmentManager.shared

    private override init() {
        super.init()
    }

    // MARK: - Helper Methods

    /// Extract domain from UPN or sanitize OID for logging
    func extractDomain(from identity: String) -> String {
        if identity.contains("@") {
            return identity.components(separatedBy: "@").last ?? "unknown"
        }
        // Sanitize OID (show only first 8 chars)
        return "oid:\(identity.prefix(8))..."
    }

    /// Sanitize OID for privacy-safe logging
    func sanitizeOID(_ oid: String) -> String {
        // Only log first 8 chars for privacy
        return "\(oid.prefix(8))..."
    }
}
