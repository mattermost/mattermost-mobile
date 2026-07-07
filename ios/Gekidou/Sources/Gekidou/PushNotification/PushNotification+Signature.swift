import Foundation
import UserNotifications
import SwiftJWT

struct NotificationClaims : Claims {
    var ack_id: String;
    var device_id: String;
}

extension PushNotification {
    public func verifySignatureFromNotification(_ notification: UNMutableNotificationContent) -> Bool {
        return self.verifySignature(notification.userInfo)
    }
    public func verifySignature(_ userInfo: [AnyHashable : Any]) -> Bool {
        return verifySignature(userInfo, storedDeviceToken: Database.default.getDeviceToken(), requireSignature: false)
    }
    public func verifyVoIPSignature(_ userInfo: [AnyHashable : Any]) -> Bool {
        // VoIP pushes are a new feature with no legacy proxies in the wild,
        // so the "missing signature → accept" fallback used for standard
        // pushes must NOT apply here. An unsigned VoIP payload would let an
        // attacker trigger the CallKit incoming-call UI without
        // authentication, so always require a signature.
        return verifySignature(userInfo, storedDeviceToken: Database.default.getVoIPDeviceToken(), requireSignature: true)
    }
    private func verifySignature(_ userInfo: [AnyHashable : Any], storedDeviceToken: String?, requireSignature: Bool) -> Bool {
        guard let signature =  userInfo["signature"] as? String
        else {
            if requireSignature {
                GekidouLogger.shared.log(.info, "Gekidou PushNotification: Signature verification: No signature in the notification (required)")
                return false
            }
            // Backward compatibility with old push proxies
            GekidouLogger.shared.log(.info, "Gekidou PushNotification: Signature verification: No signature in the notification")
            return true
        }

        guard let serverId =  userInfo["server_id"] as? String
        else {
            GekidouLogger.shared.log(.info, "Gekidou PushNotification: Signature verification: No server_id in the notification")
            return false
        }

        guard let serverUrl = try? Database.default.getServerUrlForServer(serverId)
        else {
            GekidouLogger.shared.log(.info, "Gekidou PushNotification: Signature verification: No server_url for server_id")
            return false
        }

        if Database.default.isZeroPersistenceServer(serverUrl) {
            if signature == "NO_SIGNATURE" {
                GekidouLogger.shared.log(.info, "Gekidou PushNotification: Signature verification: Cannot verify unsigned notification for zero-persistence server")
                return false
            }
            guard let signingKey = Database.default.getZeroPersistenceSigningKey(serverUrl) else {
                GekidouLogger.shared.log(.info, "Gekidou PushNotification: Signature verification: No signing key stored for zero-persistence server")
                return false
            }
            return verifyJwt(signature: signature, signingKey: signingKey, userInfo: userInfo, storedDeviceToken: storedDeviceToken)
        }

        if signature == "NO_SIGNATURE" {
            if requireSignature {
                // Same reasoning as the missing-signature case above —
                // VoIP must always carry a real signature.
                GekidouLogger.shared.log(.info, "Gekidou PushNotification: Signature verification: NO_SIGNATURE sentinel rejected (signature required)")
                return false
            }
            guard let version = Database.default.getConfig(serverUrl, "Version")
            else {
                GekidouLogger.shared.log(.info, "Gekidou PushNotification: Signature verification: No server version")
                return false
            }

            let parts = version.components(separatedBy: ".");
            guard parts.count >= 3
            else {
                GekidouLogger.shared.log(.info, "Gekidou PushNotification: Signature verification: Invalid server version format")
                return false
            }
            guard let major = Int(parts[0]),
                  let minor = Int(parts[1]),
                  let patch = Int(parts[2])
            else {
                GekidouLogger.shared.log(.info, "Gekidou PushNotification: Signature verification: Invalid server version")
                return false
            }
            
            let versionTargets = [[9,8,0], [9,7,3], [9,6,3], [9,5,5], [8,1,14]]
            var rejected = false
            for (index, versionTarget) in versionTargets.enumerated() {
                let first = index == 0
                guard versionTarget.count >= 3 else {
                    GekidouLogger.shared.log(.error, "Gekidou PushNotification: Invalid versionTarget format at index %{public}d: expected 3 elements, got %{public}d", index, versionTarget.count)
                    continue
                }
                let majorTarget = versionTarget[0]
                let minorTarget = versionTarget[1]
                let patchTarget = versionTarget[2]
                
                if (major > majorTarget) {
                    // Only reject if we are considering the first (highest) version.
                    // Any version in between should be acceptable.
                    rejected = first;
                    break;
                }

                if (major < majorTarget) {
                    // Continue to see if it complies with a smaller target
                    continue;
                }

                // Same major
                if (minor > minorTarget) {
                    // Only reject if we are considering the first (highest) version.
                    // Any version in between should be acceptable.
                    rejected = first;
                    break;
                }

                if (minor < minorTarget) {
                    // Continue to see if it complies with a smaller target
                    continue;
                }

                // Same major and same minor
                if (patch >= patchTarget) {
                    rejected = true;
                    break;
                }

                // Patch is lower than target
                return true;
            }
            
            if (rejected) {
                GekidouLogger.shared.log(.info, "Gekidou PushNotification: Signature verification: Server version should send signature")
                return false;
            }
            
            // Version number is below any of the targets, so it should not send the signature
            return true
        }
        
        guard let signingKey = Database.default.getConfig(serverUrl, "AsymmetricSigningPublicKey")
        else {
            GekidouLogger.shared.log(.info, "Gekidou PushNotification: Signature verification: No signing key")
            return false
        }

        return verifyJwt(signature: signature, signingKey: signingKey, userInfo: userInfo, storedDeviceToken: storedDeviceToken)
    }

    private func verifyJwt(signature: String, signingKey: String, userInfo: [AnyHashable: Any], storedDeviceToken: String?) -> Bool {
        let keyPEM = """
-----BEGIN PUBLIC KEY-----
\(signingKey)
-----END PUBLIC KEY-----
"""
        guard let keyPEMData = keyPEM.data(using: .utf8) else {
            GekidouLogger.shared.log(.info, "Gekidou PushNotification: Signature verification: Failed to encode key PEM as UTF-8")
            return false
        }

        let jwtVerifier = JWTVerifier.es256(publicKey: keyPEMData)
        guard let newJWT = try? JWT<NotificationClaims>(jwtString: signature, verifier: jwtVerifier)
        else {
            GekidouLogger.shared.log(.info, "Gekidou PushNotification: Signature verification: Cannot verify the signature")
            return false
        }

        guard let ackId = userInfo["ack_id"] as? String
        else {
            GekidouLogger.shared.log(.info, "Gekidou PushNotification: Signature verification: No ack_id in the notification")
            return false
        }

        if (ackId != newJWT.claims.ack_id) {
            GekidouLogger.shared.log(.info, "Gekidou PushNotification: Signature verification: ackId is different")
            return false
        }

        guard let storedDeviceToken = storedDeviceToken
        else {
            GekidouLogger.shared.log(.info, "Gekidou PushNotification: Signature verification: No device token")
            return false
        }

        let tokenParts = storedDeviceToken.components(separatedBy: ":")
        guard tokenParts.count == 2 else {
            GekidouLogger.shared.log(.info, "Gekidou PushNotification: Signature verification: Wrong stored device token format (expected 2 parts, got %{public}d)", tokenParts.count)
            return false
        }

        let deviceToken = tokenParts[1].dropLast(1)
        if (deviceToken.isEmpty) {
            GekidouLogger.shared.log(.info, "Gekidou PushNotification: Signature verification: Empty stored device token")
            return false
        }

        if (deviceToken != newJWT.claims.device_id) {
            GekidouLogger.shared.log(.info, "Gekidou PushNotification: Signature verification: Device token is different")
            return false
        }

        return true
    }
}
