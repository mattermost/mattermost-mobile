//
//  Keychain.swift
//  Gekidou
//
//  Created by Miguel Alatzar on 8/20/21.
//

import Foundation

public struct ServerCredentials {
    public let token: String?
    public let preauthSecret: String?
}

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

    @objc public func getCredentialsObjc(for serverUrl: String) -> NSDictionary? {
        guard let credentials = try? getCredentials(for: serverUrl) else { return nil }
        return [
            "token": credentials.token as Any,
            "preauthSecret": credentials.preauthSecret as Any
        ]
    }

    public func getCredentials(for serverUrl: String) throws -> ServerCredentials? {
        // Get main token from serverUrl key
        let token = try getMainToken(for: serverUrl)
        let preauthSecret = try? getPreauthSecret(for: serverUrl)

        return ServerCredentials(token: token, preauthSecret: preauthSecret)
    }

    private func getMainToken(for serverUrl: String) throws -> String? {
        var attributes = try buildTokenAttributes(for: serverUrl)
        attributes[kSecMatchLimit] = kSecMatchLimitOne
        attributes[kSecReturnData] = kCFBooleanTrue

        var result: AnyObject?
        let status = SecItemCopyMatching(attributes as CFDictionary, &result)
        let data = result as? Data
        if status == errSecSuccess && data != nil {
            let token = String(data: data!, encoding: .utf8)
            return token
        }

        return nil
    }

    private func getPreauthSecret(for serverUrl: String) throws -> String? {
        var attributes = try buildGenericPasswordAttributes(for: serverUrl, account: "preshared_secret")
        attributes[kSecMatchLimit] = kSecMatchLimitOne
        attributes[kSecReturnData] = kCFBooleanTrue

        var result: AnyObject?
        let status = SecItemCopyMatching(attributes as CFDictionary, &result)
        let data = result as? Data
        if status == errSecSuccess && data != nil {
            let preauthSecret = String(data: data!, encoding: .utf8)
            return preauthSecret
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

    private func buildGenericPasswordAttributes(for service: String, account: String) throws -> [CFString: Any] {
        guard let serviceData = service.data(using: .utf8) else {
            throw KeychainError.InvalidServerUrl(service)
        }

        guard let accountData = account.data(using: .utf8) else {
            throw KeychainError.InvalidServerUrl(account)
        }

        var attributes: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: serviceData,
            kSecAttrAccount: accountData
        ]

        if let accessGroup = Bundle.main.object(forInfoDictionaryKey: "AppGroupIdentifier") as! String? {
            attributes[kSecAttrAccessGroup] = accessGroup
        }

        return attributes
    }
}
