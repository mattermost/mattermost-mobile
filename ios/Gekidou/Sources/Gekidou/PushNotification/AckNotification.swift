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
            serverUrl = try Database.default.getServerUrlForServer(decodedIdentifier)
        } else {
            serverUrl = try Database.default.getOnlyServerUrl()
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
