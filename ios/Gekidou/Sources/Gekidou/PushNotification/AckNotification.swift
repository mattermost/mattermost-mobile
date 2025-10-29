import Foundation

public struct AckNotification: Codable {
    let type: String
    let id: String
    let postId: String?
    public let serverUrl: String
    public let isIdLoaded: Bool
    let receivedAt:Int
    let platform = "ios"
    
    public enum AckNotificationKeys: String, CodingKey {
        case type = "type"
        case id = "ack_id"
        case postId = "post_id"
        case server_id = "server_id"
        case isIdLoaded = "id_loaded"
        case platform = "platform"
    }
    
    public enum AckNotificationRequestKeys: String, CodingKey {
        case type = "type"
        case id = "id"
        case postId = "post_id"
        case isIdLoaded = "is_id_loaded"
        case receivedAt = "received_at"
        case platform = "platform"
    }
    
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: AckNotificationKeys.self)
        id = try container.decode(String.self, forKey: .id)
        type = try container.decode(String.self, forKey: .type)
        postId = try? container.decode(String.self, forKey: .postId)
        if container.contains(.isIdLoaded) {
            isIdLoaded = (try? container.decode(Bool.self, forKey: .isIdLoaded)) == true
        } else {
            isIdLoaded = false
        }
        receivedAt = Date().millisecondsSince1970

        if let decodedIdentifier = try? container.decode(String.self, forKey: .server_id) {
            if let url = try? Database.default.getServerUrlForServer(decodedIdentifier) {
                serverUrl = url
            } else {
                GekidouLogger.shared.log(.error, "Gekidou AckNotification: Failed to get server URL for server ID %{public}@", decodedIdentifier)
                throw DecodingError.dataCorruptedError(
                    forKey: .server_id,
                    in: container,
                    debugDescription: "Failed to retrieve server URL for server ID: \(decodedIdentifier)"
                )
            }
        } else {
            if let url = try? Database.default.getOnlyServerUrl() {
                serverUrl = url
            } else {
                GekidouLogger.shared.log(.error, "Gekidou AckNotification: Failed to get only server URL - no servers configured")
                throw DecodingError.dataCorrupted(
                    DecodingError.Context(
                        codingPath: decoder.codingPath,
                        debugDescription: "Failed to retrieve server URL - no servers configured"
                    )
                )
            }
        }
    }
    
    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: AckNotificationRequestKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(postId, forKey: .postId)
        try container.encode(receivedAt, forKey: .receivedAt)
        try container.encode(platform, forKey: .platform)
        try container.encode(type, forKey: .type)
        try container.encode(isIdLoaded, forKey: .isIdLoaded)
    }
}
