// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Foundation
import MSAL
import Gekidou
import UIKit

// MARK: - MSAL Authentication Manager

class IntuneMSALAuthManager {
    // MARK: - Properties

    private var msalApp: MSALPublicClientApplication?
    private let logger = GekidouLogger.shared

    private static let msalScopes = ["User.Read", "offline_access"]
    private static let authority = "https://login.microsoftonline.com/organizations"

    // MARK: - Configuration

    func configure(clientId: String, redirectUri: String) throws {
        // Try configuration with retry logic
        for attempt in 1...3 {
            do {
                try attemptConfiguration(clientId: clientId, redirectUri: redirectUri)
                logger.log(.info, "[IntuneMSAL] Configured successfully")
                return
            } catch {
                if !isRetriableError(error) {
                    logger.log(.error, "[IntuneMSAL] Configuration failed - non-retriable error")
                    throw error
                }

                if attempt < 3 {
                    Thread.sleep(forTimeInterval: TimeInterval(attempt))
                } else {
                    logger.log(.error, "[IntuneMSAL] Configuration failed after 3 retries")
                    throw error
                }
            }
        }
    }

    private func attemptConfiguration(clientId: String, redirectUri: String) throws {
        let msalConfig = MSALPublicClientApplicationConfig(
            clientId: clientId,
            redirectUri: redirectUri,
            authority: try MSALAADAuthority(url: URL(string: Self.authority)!)
        )
        msalConfig.clientApplicationCapabilities = ["ProtApp"]
        self.msalApp = try MSALPublicClientApplication(configuration: msalConfig)
    }

    private func isRetriableError(_ error: Error) -> Bool {
        let nsError = error as NSError
        let domain = nsError.domain as String

        // Network-related errors are retriable
        if domain == NSURLErrorDomain as String {
            return true
        }

        // MSAL errors related to configuration (invalid clientId, etc.) are NOT retriable
        if domain.contains("MSAL") {
            return false
        }

        return false
    }

    // MARK: - Public API

    /// Check if MSAL is configured
    var isConfigured: Bool {
        return msalApp != nil
    }

    /// Acquire token for a user (try silent first, fallback to interactive)
    @MainActor
    func acquireToken(loginHint: String) async throws -> MSALIdentity {
        guard let msalApp = msalApp else {
            throw NSError(domain: "Intune", code: 1, userInfo: [NSLocalizedDescriptionKey: "MSAL not configured"])
        }

        // Try silent first
        if let account = try? msalApp.account(forUsername: loginHint) {
            do {
                let result = try await acquireTokenSilent(msalApp: msalApp, account: account)
                return extractIdentity(from: result)
            } catch {
                // Silent failed, try interactive
                logger.log(.info, "[IntuneMSAL] Silent token acquisition failed, trying interactive")
            }
        }

        // Fallback to interactive
        let result = try await acquireTokenInteractive(msalApp: msalApp, loginHint: loginHint, account: nil)
        return extractIdentity(from: result)
    }

    /// Refresh token for a specific OID
    @MainActor
    func refreshToken(for oid: String) async throws {
        guard let msalApp = msalApp else {
            throw NSError(domain: "Intune", code: 1, userInfo: [NSLocalizedDescriptionKey: "MSAL not configured"])
        }

        let allAccounts = try msalApp.allAccounts()
        guard let account = allAccounts.first(where: { $0.homeAccountId?.objectId == oid }) else {
            throw NSError(domain: "Intune", code: 3, userInfo: [NSLocalizedDescriptionKey: "Account not found"])
        }

        do {
            _ = try await acquireTokenSilent(msalApp: msalApp, account: account)
            logger.log(.info, "[IntuneMSAL] Token refreshed successfully")
        } catch let error as NSError {
            if error.domain == MSALErrorDomain, error.code == MSALError.interactionRequired.rawValue {
                _ = try await acquireTokenInteractive(msalApp: msalApp, loginHint: nil, account: account)
                logger.log(.info, "[IntuneMSAL] Token refreshed interactively")
            } else {
                throw error
            }
        }
    }

    /// Check if an account exists in MSAL cache for given OID
    @MainActor
    func hasAccount(forOID oid: String) async throws -> Bool {
        guard let msalApp = msalApp else {
            return false
        }

        let allAccounts = try msalApp.allAccounts()
        return allAccounts.contains(where: { $0.homeAccountId?.objectId == oid })
    }

    // MARK: - Token Acquisition

    @MainActor
    private func acquireTokenSilent(msalApp: MSALPublicClientApplication, account: MSALAccount) async throws -> MSALResult {
        let parameters = MSALSilentTokenParameters(scopes: Self.msalScopes, account: account)
        return try await msalApp.acquireTokenSilent(with: parameters)
    }

    @MainActor
    private func acquireTokenInteractive(
        msalApp: MSALPublicClientApplication,
        loginHint: String?,
        account: MSALAccount?
    ) async throws -> MSALResult {
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let rootViewController = windowScene.windows.first?.rootViewController else {
            throw NSError(domain: "Intune", code: 2, userInfo: [NSLocalizedDescriptionKey: "No root view controller"])
        }

        let webviewParameters = MSALWebviewParameters(authPresentationViewController: rootViewController)
        let parameters = MSALInteractiveTokenParameters(scopes: Self.msalScopes, webviewParameters: webviewParameters)

        if let loginHint = loginHint {
            parameters.loginHint = loginHint
            parameters.promptType = .selectAccount
        } else if let account = account {
            parameters.account = account
            parameters.promptType = .default
        }

        return try await msalApp.acquireToken(with: parameters)
    }

    // MARK: - Identity Extraction

    private func extractIdentity(from result: MSALResult) -> MSALIdentity {
        return MSALIdentity(
            upn: result.account.username ?? "",
            tid: result.tenantProfile.tenantId ?? "",
            oid: result.account.homeAccountId?.objectId ?? ""
        )
    }
}
