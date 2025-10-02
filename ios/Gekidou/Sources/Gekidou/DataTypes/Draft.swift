import Foundation

public struct Draft: Codable {
    let id: String
    let channelId: String
    let rootId: String
    let message: String
    let files: [[String: Any]]
    let metadata: String
    let updateAt: Double

    public init(
        id: String,
        channelId: String,
        rootId: String ,
        message: String,
        files: [[String: Any]],
        metadata: String,
        updateAt: Double
    ) {
        self.id = id
        self.channelId = channelId
        self.rootId = rootId
        self.message = message
        self.files = files
        self.metadata = metadata
        self.updateAt = updateAt
    }

    public enum DraftKeys: String, CodingKey {
        case id, message, files, metadata
        case channelId = "channel_id"
        case rootId = "root_id"
        case updateAt = "update_at"
    }

    public init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: DraftKeys.self)
        id = try values.decode(String.self, forKey: .id)
        channelId = try values.decode(String.self, forKey: .channelId)
        rootId = values.decodeIfPresent(forKey: .rootId, defaultValue: "")
        message = values.decodeIfPresent(forKey: .message, defaultValue: "")
        updateAt = values.decodeIfPresent(forKey: .updateAt, defaultValue: 0)

        if let rawFiles = try? values.decode(String.self, forKey: .files),
           let data = rawFiles.data(using: .utf8),
           let parsed = try? JSONSerialization.jsonObject(with: data, options: []) as? [[String: Any]] {
            files = parsed
        } else {
            files = []
        }
        
        if let meta = try? values.decode([String:Any].self, forKey: .metadata) {
            metadata = Database.default.json(from: meta) ?? "{}"
        } else {
            metadata = "{}"
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: DraftKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(channelId, forKey: .channelId)
        try container.encode(rootId, forKey: .rootId)
        try container.encode(message, forKey: .message)
        try container.encode(updateAt, forKey: .updateAt)
        
        if let data = try? JSONSerialization.data(withJSONObject: files, options: []),
           let jsonString = String(data: data, encoding: .utf8) {
            try container.encode(jsonString, forKey: .files)
        } else {
            try container.encode("[]", forKey: .files)
        }
        
        try container.encode(metadata, forKey: .metadata)
    }
}
