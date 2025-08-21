//
//  Keychain.swift
//  Gekidou
//
//  Created by Miguel Alatzar on 8/20/21.
//

import Foundation

enum KeychainError: Error {
    case CertificateForIdentityNotFound
    case IdentityNotFound
    case InvalidServerUrl(_ serverUrl: String)
    case InvalidHost(_ host: String)
    case FailedSecIdentityCopyCertificate(_ status: OSStatus)
    case FailedSecItemCopyMatching(_ status: OSStatus)
}

extension KeychainError: LocalizedError {
    var errorCode: Int32? {
        switch self {
        case .CertificateForIdentityNotFound: return -100
        case .IdentityNotFound: return -101
        case .InvalidServerUrl(_): return -106
        case .InvalidHost(_): return -107
        case .FailedSecIdentityCopyCertificate(status: let status): return status
        case .FailedSecItemCopyMatching(status: let status): return status
        }
    }

    var errorDescription: String? {
        switch self {
        case .CertificateForIdentityNotFound:
            return "Certificate for idendity not found"
        case .IdentityNotFound:
            return "Identity not found"
        case .InvalidServerUrl(serverUrl: let serverUrl):
            return "Invalid server URL: \(serverUrl)"
        case .InvalidHost(host: let host):
            return "Invalid host: \(host)"
        case .FailedSecIdentityCopyCertificate(status: let status):
            return "Failed to copy certificate: iOS code \(status)"
        case .FailedSecItemCopyMatching(status: let status):
            return "Failed to copy Keychain item: iOS code \(status)"
        }
    }
}

public class Keychain: NSObject {
    @objc public static let `default` = Keychain()

    public func getClientIdentityAndCertificate(for host: String) throws -> (SecIdentity, SecCertificate)? {
        let query = try buildIdentityQuery(for: host)

        var result: AnyObject?
        let identityStatus = SecItemCopyMatching(query as CFDictionary, &result)
        guard identityStatus == errSecSuccess else {
            if identityStatus == errSecItemNotFound {
                throw KeychainError.IdentityNotFound
            }

            throw KeychainError.FailedSecItemCopyMatching(identityStatus)
        }

        let identity = result as! SecIdentity
        var certificate: SecCertificate?
        let certificateStatus = SecIdentityCopyCertificate(identity, &certificate)
        guard certificateStatus == errSecSuccess else {
            throw KeychainError.FailedSecIdentityCopyCertificate(certificateStatus)
        }
        guard certificate != nil else {
            throw KeychainError.CertificateForIdentityNotFound
        }

        return (identity, certificate!)
    }

    @objc public func getTokenObjc(for serverUrl: String) -> String? {
        return try? getToken(for: serverUrl)
    }

    public func getToken(for serverUrl: String) throws -> String? {
        var attributes = try buildTokenAttributes(for: serverUrl)
        attributes[kSecMatchLimit] = kSecMatchLimitOne
        attributes[kSecReturnData] = kCFBooleanTrue

        var result: AnyObject?
        let status = SecItemCopyMatching(attributes as CFDictionary, &result)
        let data = result as? Data
        if status == errSecSuccess && data != nil {
            let credentialsString = String(data: data!, encoding: .utf8)

            // Try to parse as JSON first (new format)
            if let credentialsString = credentialsString,
                let credentialsData = credentialsString.data(using: .utf8) {
                do {
                    let json = try JSONSerialization.jsonObject(with: credentialsData, options: [])
                    if let jsonDict = json as? [String: Any],
                        let token = jsonDict["token"] as? String {
                        return token  // Extract token from JSON
                    }
                } catch {
                    // JSON parsing failed, fall back to old format
                    return credentialsString  // Return as plain string
                }
            }

            return credentialsString  // Fallback to plain string
        }

        return nil
    }

    @objc public func getPreauthSecretObjc(for serverUrl: String) -> String? {
        return try? getPreauthSecret(for: serverUrl)
    }

    public func getPreauthSecret(for serverUrl: String) throws -> String? {
        var attributes = try buildTokenAttributes(for: serverUrl)
        attributes[kSecMatchLimit] = kSecMatchLimitOne
        attributes[kSecReturnData] = kCFBooleanTrue

        var result: AnyObject?
        let status = SecItemCopyMatching(attributes as CFDictionary, &result)
        let data = result as? Data
        if status == errSecSuccess && data != nil {
            let credentialsString = String(data: data!, encoding: .utf8)

            // Try to parse as JSON to get preauthSecret
            if let credentialsString = credentialsString,
                let credentialsData = credentialsString.data(using: .utf8) {
                do {
                    let json = try JSONSerialization.jsonObject(with: credentialsData, options: [])
                    if let jsonDict = json as? [String: Any],
                        let preauthSecret = jsonDict["preauthSecret"] as? String {
                        return preauthSecret
                    }
                } catch {
                    // If JSON parsing fails, it might be old format with just token
                    // In that case, there's no preauth secret
                    return nil
                }
            }
        }

        return nil
    }

    private func buildIdentityQuery(for host: String) throws -> [CFString: Any] {
        guard let hostData = host.data(using: .utf8) else {
            throw KeychainError.InvalidHost(host)
        }

        let query: [CFString:Any] = [
            kSecClass: kSecClassIdentity,
            kSecAttrLabel: hostData,
            kSecReturnRef: true
        ]

        return query
    }

    private func buildTokenAttributes(for serverUrl: String) throws -> [CFString: Any] {
        guard let serverUrlData = serverUrl.data(using: .utf8) else {
            throw KeychainError.InvalidServerUrl(serverUrl)
        }

        var attributes: [CFString: Any] = [
            kSecClass: kSecClassInternetPassword,
            kSecAttrServer: serverUrlData
        ]

        if let accessGroup = Bundle.main.object(forInfoDictionaryKey: "AppGroupIdentifier") as! String? {
            attributes[kSecAttrAccessGroup] = accessGroup
        }

        return attributes
    }
}
