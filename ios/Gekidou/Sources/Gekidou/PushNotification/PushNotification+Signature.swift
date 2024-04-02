import Foundation
import UserNotifications
import os.log
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
            os_log(
                OSLogType.default,
                "Mattermost Notifications: Signature verification: No signature in the notification"
            )
            return true
        }
        
        guard let serverId =  userInfo["server_id"] as? String
        else {
            os_log(
                OSLogType.default,
                "Mattermost Notifications: Signature verification: No server_id in the notification"
            )
            return false
        }
        
        guard let serverUrl = try? Database.default.getServerUrlForServer(serverId)
        else {
            os_log(
                OSLogType.default,
                "Mattermost Notifications: Signature verification: No server_url for server_id"
            )
            return false
        }
        
        if signature == "NO_SIGNATURE" {
            guard let version = Database.default.getConfig(serverUrl, "Version")
            else {
                os_log(
                    OSLogType.default,
                    "Mattermost Notifications: Signature verification: No server version"
                )
                return false
            }
            
            let versionTarget = "9.7.0"
            let versionOrder = version.compare(versionTarget, options: .numeric)
            if (versionOrder == .orderedSame || versionOrder == .orderedDescending) {
                os_log(
                    OSLogType.default,
                    "Mattermost Notifications: Signature verification: Server version should send signature"
                )
                return false
            }
        }
        
        guard let signingKey = Database.default.getConfig(serverUrl, "AsymmetricSigningPublicKey")
        else {
            os_log(
                OSLogType.default,
                "Mattermost Notifications: Signature verification: No signing key"
            )
            return false
        }

        let keyPEM = """
-----BEGIN PUBLIC KEY-----
\(signingKey)
-----END PUBLIC KEY-----
"""
        let jwtVerifier = JWTVerifier.es256(publicKey: keyPEM.data(using: .utf8)!)
        guard let newJWT = try? JWT<NotificationClaims>(jwtString: signature, verifier: jwtVerifier)
        else {
            os_log(
                OSLogType.default,
                "Mattermost Notifications: Signature verification: Cannot verify the signature"
            )
            return false
        }
        
        guard let ackId = userInfo["ack_id"] as? String
        else {
            os_log(
                OSLogType.default,
                "Mattermost Notifications: Signature verification: No ack_id in the notification"
            )
            return false
        }
        
        if (ackId != newJWT.claims.ack_id) {
            os_log(
                OSLogType.default,
                "Mattermost Notifications: Signature verification: ackId is different"
            )
            return false
        }
        
        guard let storedDeviceToken = Database.default.getDeviceToken()
        else {
            os_log(
                OSLogType.default,
                "Mattermost Notifications: Signature verification: No device token"
            )
            return false
        }
        
        let tokenParts = storedDeviceToken.components(separatedBy: ":")
        if (tokenParts.count != 2) {
            os_log(
                OSLogType.default,
                "Mattermost Notifications: Signature verification: Wrong stored device token format"
            )
            return false
        }
        let deviceToken = tokenParts[1].dropLast(1)
        if (deviceToken.isEmpty) {
            os_log(
                OSLogType.default,
                "Mattermost Notifications: Signature verification: Empty stored device token"
            )
            return false
        }

        if (deviceToken != newJWT.claims.device_id) {
            os_log(
                OSLogType.default,
                "Mattermost Notifications: Signature verification: Device token is different"
            )
            return false
        }

        return true
    }
}
