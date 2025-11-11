// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Foundation
import Gekidou

// MARK: - Data Model

public struct MSALIdentity: Codable {
    let upn: String
    let tid: String
    let oid: String
    var serverUrl: String?
    var enrolledAt: Date?
}

// MARK: - Storage Manager

class IntuneEnrollmentStorage {
    // MARK: - Constants

    private enum KeychainConstants {
        static let service = "com.mattermost.intune"
        static let enrollmentsAccount = "enrollments"
    }

    private enum StorageError: Int {
        case encodingFailed = 4
        case serverUrlRequired = 5

        var error: NSError {
            let message: String
            switch self {
            case .encodingFailed:
                message = "Failed to encode enrollments"
            case .serverUrlRequired:
                message = "ServerUrl is required"
            }
            return NSError(domain: "Intune", code: self.rawValue, userInfo: [NSLocalizedDescriptionKey: message])
        }
    }

    // MARK: - Properties

    private var cache: [String: MSALIdentity]?
    private var cacheInvalidated: Bool = true
    private let logger = GekidouLogger.shared

    // MARK: - Public API

    /// Get enrollment for a specific server URL (cached)
    func getEnrollment(forServerUrl serverUrl: String) -> MSALIdentity? {
        let enrollments = getCachedEnrollments()
        return enrollments[serverUrl]
    }

    /// Get all enrollments (cached)
    func getAllEnrollments() -> [String: MSALIdentity] {
        return getCachedEnrollments()
    }

    /// Store enrollment for a server
    func storeEnrollment(_ identity: MSALIdentity) throws {
        guard let serverUrl = identity.serverUrl, !serverUrl.isEmpty else {
            throw StorageError.serverUrlRequired.error
        }

        var enrollments = retrieveAllEnrollments()
        enrollments[serverUrl] = identity

        try persistEnrollments(enrollments)
        invalidateCache()

        logger.log(.info, "[IntuneStorage] Stored enrollment for server")
    }

    /// Clear enrollment for a specific server
    func clearEnrollment(forServerUrl serverUrl: String) throws {
        var enrollments = retrieveAllEnrollments()
        enrollments.removeValue(forKey: serverUrl)

        if enrollments.isEmpty {
            try Keychain.default.removeGenericPassword(
                forService: KeychainConstants.service,
                account: KeychainConstants.enrollmentsAccount
            )
            logger.log(.info, "[IntuneStorage] Removed all enrollments")
        } else {
            try persistEnrollments(enrollments)
            logger.log(.info, "[IntuneStorage] Removed enrollment for server")
        }

        invalidateCache()
    }

    /// Get all server URLs associated with a specific OID
    func getServerUrls(forOID oid: String) -> [String] {
        let enrollments = getCachedEnrollments()
        return enrollments
            .filter { $0.value.oid == oid }
            .map { $0.key }
    }

    /// Check if any enrollments exist
    func hasEnrollments() -> Bool {
        return !getCachedEnrollments().isEmpty
    }

    // MARK: - Cache Management

    private func invalidateCache() {
        cacheInvalidated = true
    }

    private func getCachedEnrollments() -> [String: MSALIdentity] {
        if cacheInvalidated || cache == nil {
            cache = retrieveAllEnrollments()
            cacheInvalidated = false
        }
        return cache ?? [:]
    }

    // MARK: - Keychain Operations

    private func retrieveAllEnrollments() -> [String: MSALIdentity] {
        guard let jsonString = try? Keychain.default.getGenericPassword(
            forService: KeychainConstants.service,
            account: KeychainConstants.enrollmentsAccount
        ),
              let data = jsonString.data(using: .utf8),
              let enrollments = try? JSONDecoder().decode([String: MSALIdentity].self, from: data) else {
            return [:]
        }
        return enrollments
    }

    private func persistEnrollments(_ enrollments: [String: MSALIdentity]) throws {
        let data = try JSONEncoder().encode(enrollments)
        guard let jsonString = String(data: data, encoding: .utf8) else {
            throw StorageError.encodingFailed.error
        }

        try Keychain.default.setGenericPassword(
            jsonString,
            forService: KeychainConstants.service,
            account: KeychainConstants.enrollmentsAccount
        )
    }
}
