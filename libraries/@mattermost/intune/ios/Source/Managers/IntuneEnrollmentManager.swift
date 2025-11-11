// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Foundation
import MSAL
import IntuneMAMSwift
import Gekidou

@objc public class IntuneEnrollmentManager: NSObject {
    @objc public static let shared = IntuneEnrollmentManager()

    private let logger = GekidouLogger.shared
    @objc public weak var delegate: IntuneManagerDelegate? = nil
    private let storage = IntuneEnrollmentStorage()
    private let authManager = IntuneMSALAuthManager()
    private let policyProvider = IntunePolicyProvider()

    private override init() {
        super.init()
        configure()
    }

    private func configure() {
        guard let intuneSettings = Bundle.main.infoDictionary?["IntuneMAMSettings"] as? [String: Any],
              let clientId = intuneSettings["ADALClientId"] as? String,
              let redirectUri = intuneSettings["ADALRedirectUri"] as? String else {
            logger.log(.info, "[Intune] Not configured")
            return
        }

        do {
            try authManager.configure(clientId: clientId, redirectUri: redirectUri)
            logger.log(.info, "[Intune] Configured")
        } catch {
            logger.log(.error, "[Intune] Configuration failed: %@", error.localizedDescription)
        }
    }

    // MARK: - Public API

    @objc public func attachAndEnroll(
        serverUrl: String,
        loginHint: String,
        completion: @escaping ([String: Any]?, Error?) -> Void
    ) {
        guard authManager.isConfigured else {
            let error = NSError(domain: "Intune", code: 1001, userInfo: [NSLocalizedDescriptionKey: "Not configured"])
            completion(nil, error)
            return
        }

        Task { @MainActor in
            do {
                var identity = try await authManager.acquireToken(loginHint: loginHint)
                identity.serverUrl = serverUrl
                identity.enrolledAt = Date()

                // Store enrollment in keychain
                try storage.storeEnrollment(identity)

                // Register with SDK
                let enrollmentManager = IntuneMAMEnrollmentManager.instance()
                enrollmentManager.registerAndEnrollAccountId(identity.oid)

                logger.log(.info, "[Intune] Enrollment initiated for domain: %@", extractDomain(from: identity.upn))

                completion([
                    "upn": identity.upn,
                    "tid": identity.tid,
                    "oid": identity.oid
                ], nil)
            } catch {
                logger.log(.warning, "[Intune] Enrollment failed (non-blocking): %@", error.localizedDescription)
                completion(nil, error)
            }
        }
    }

    @objc public func getEnrolledAccount() -> String? {
        let enrollmentManager = IntuneMAMEnrollmentManager.instance()
        return enrollmentManager.enrolledAccountId()
    }

    @objc public func isManagedAccount(_ oid: String) -> Bool {
        return policyProvider.isManagedAccount(oid)
    }

    @objc public func deregisterAndUnenroll(serverUrl: String, oid: String, doWipe: Bool) {
        // Clear keychain for this server
        try? storage.clearEnrollment(forServerUrl: serverUrl)

        // Check if other servers are using this OID
        let remainingServers = storage.getServerUrls(forOID: oid)

        if remainingServers.isEmpty {
            // Last server with this OID, fully unenroll from SDK
            let enrollmentManager = IntuneMAMEnrollmentManager.instance()
            enrollmentManager.deRegisterAndUnenrollAccountId(oid, withWipe: doWipe)
            logger.log(.info, "[Intune] Fully unenrolled OID from SDK")
        } else {
            logger.log(.info, "[Intune] Removed server enrollment, OID still used by other servers")
        }
    }

    @objc public func setCurrentIdentity(forServerUrl serverUrl: String?) {
        if let serverUrl = serverUrl,
           let enrollment = storage.getEnrollment(forServerUrl: serverUrl) {
            policyProvider.setCurrentIdentity(oid: enrollment.oid) { [weak self] success in
                if success {
                    self?.logger.log(.info, "[Intune] Set policy identity for server %{public}@", serverUrl)
                } else {
                    self?.logger.log(.info, "[Intune] Failed to set policy identity for server %{public}@", serverUrl)
                }
            }
        } else {
            policyProvider.setCurrentIdentity(oid: nil) { [weak self] _ in
                self?.logger.log(.info, "[Intune] Set unmanaged mode")
            }
        }
    }

    @objc public func getPolicy(forAccountId oid: String) -> [String: Any]? {
        return policyProvider.getPolicy(forAccountId: oid)
    }

    @objc public func isScreenCaptureAllowed(forAccountId oid: String) -> Bool {
        return policyProvider.isScreenCaptureAllowed(forAccountId: oid)
    }

    @objc public func canSaveToLocation(_ location: Int, oid: String) -> Bool {
        return policyProvider.canSaveToLocation(location, oid: oid)
    }

    // MARK: - ServerUrl-Based API (Public Interface)

    @objc public func isManagedServer(_ serverUrl: String) -> Bool {
        guard let enrollment = storage.getEnrollment(forServerUrl: serverUrl) else {
            return false
        }
        return isManagedAccount(enrollment.oid)
    }

    @objc public func getPolicy(forServerUrl serverUrl: String) -> [String: Any]? {
        guard let enrollment = storage.getEnrollment(forServerUrl: serverUrl) else {
            return nil
        }
        return getPolicy(forAccountId: enrollment.oid)
    }

    @objc public func isScreenCaptureAllowed(forServerUrl serverUrl: String) -> Bool {
        guard let enrollment = storage.getEnrollment(forServerUrl: serverUrl) else {
            return true // No enrollment = allow
        }
        return isScreenCaptureAllowed(forAccountId: enrollment.oid)
    }

    @objc public func canSaveToLocation(_ location: Int, serverUrl: String) -> Bool {
        guard let enrollment = storage.getEnrollment(forServerUrl: serverUrl) else {
            return true // No enrollment = allow
        }
        return canSaveToLocation(location, oid: enrollment.oid)
    }

    // MARK: - Token Refresh

    @MainActor
    @objc public func refreshMSALToken(for oid: String) async throws {
        try await authManager.refreshToken(for: oid)
        logger.log(.info, "[Intune] Token refreshed via auth manager")
    }

    // MARK: - Enrollment Restoration

    @objc public func checkAndRestoreEnrollmentOnLaunch() {
        guard authManager.isConfigured else {
            return
        }

        let storedEnrollments = storage.getAllEnrollments()
        guard !storedEnrollments.isEmpty else {
            return
        }

        let enrolledOIDs = Set(IntuneMAMEnrollmentManager.instance().enrolledAccountIds())
        var uniqueOIDs = Set<String>()

        for (_, identity) in storedEnrollments {
            if !enrolledOIDs.contains(identity.oid) && !uniqueOIDs.contains(identity.oid) {
                uniqueOIDs.insert(identity.oid)
                logger.log(.info, "[Intune] Attempting silent re-enrollment")
                Task { @MainActor in
                    await attemptSilentReEnrollment(oid: identity.oid)
                }
            }
        }
    }

    @MainActor
    private func attemptSilentReEnrollment(oid: String) async {
        do {
            // Check if account exists in MSAL cache
            let hasAccount = try await authManager.hasAccount(forOID: oid)
            guard hasAccount else {
                logger.log(.info, "[Intune] Account not in MSAL cache, SDK will retry automatically")
                return
            }

            // Refresh token silently
            try await authManager.refreshToken(for: oid)

            // Register with SDK
            IntuneMAMEnrollmentManager.instance().registerAndEnrollAccountId(oid)
            logger.log(.info, "[Intune] Silent re-enrollment initiated")
        } catch {
            logger.log(.info, "[Intune] Silent re-enrollment not possible, SDK will retry automatically")
        }
    }

    // MARK: - Storage Helpers

    @objc public func getServerUrlsForOID(_ oid: String) -> [String] {
        return storage.getServerUrls(forOID: oid)
    }

    // MARK: - Helpers

    private func extractDomain(from upn: String) -> String {
        if upn.contains("@") {
            return upn.components(separatedBy: "@").last ?? "unknown"
        }
        return "unknown"
    }

    func sendEvent(name: String, body: [String: Any]) {
        delegate?.sendEvent(name: name, body: body)
    }
}
