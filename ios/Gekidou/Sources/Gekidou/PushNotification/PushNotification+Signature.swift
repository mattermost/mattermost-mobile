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
        guard let signature =  userInfo["signature"] as? String
        else {
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
        
        if signature == "NO_SIGNATURE" {
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

        guard let storedDeviceToken = Database.default.getDeviceToken()
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
