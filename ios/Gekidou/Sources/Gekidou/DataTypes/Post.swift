import Foundation

public struct Post: Codable {
    let id: String
    let createAt: Double
    let updateAt: Double
    let editAt: Double
    let deleteAt: Double
    let isPinned: Bool
    let userId: String
    let channelId: String
    let rootId: String
    let originalId: String
    let message: String
    let messageSource: String
    let type: String
    let props: [String: Any]
    let pendingPostId: String
    let metadata: String
    var prevPostId: String
    // CRT
    let participants: [User]?
    let lastReplyAt: Double
    let replyCount: Int
    let isFollowing: Bool
    
    public enum PostKeys: String, CodingKey {
        case id, message, type, props, metadata, participants
        case messageSource = "message_source"
        case createAt = "create_at"
        case updateAt = "update_at"
        case deleteAt = "delete_at"
        case editAt = "edit_at"
        case isPinned = "is_pinned"
        case userId = "user_id"
        case channelId = "channel_id"
        case rootId = "root_id"
        case originalId = "original_id"
        case pendingPostId = "pending_post_id"
        case prevPostId = "previous_post_id"
        // CRT
        case lastReplyAt = "last_reply_at"
        case replyCount = "reply_count"
        case isFollowing = "is_following"
    }
    
    public init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: PostKeys.self)
        prevPostId = ""
        id = try values.decode(String.self, forKey: .id)
        channelId = try values.decode(String.self, forKey: .channelId)
        userId = try values.decode(String.self, forKey: .userId)
        createAt = values.decodeIfPresent(forKey: .createAt, defaultValue: 0)
        updateAt = values.decodeIfPresent(forKey: .updateAt, defaultValue: 0)
        deleteAt = values.decodeIfPresent(forKey: .deleteAt, defaultValue: 0)
        editAt = values.decodeIfPresent(forKey: .editAt, defaultValue: 0)
        isPinned = values.decodeIfPresent(forKey: .isPinned, defaultValue: false)
        rootId = values.decodeIfPresent(forKey: .rootId, defaultValue: "")
        originalId = values.decodeIfPresent(forKey: .originalId, defaultValue: "")
        message = values.decodeIfPresent(forKey: .message, defaultValue: "")
        messageSource = values.decodeIfPresent(forKey: .messageSource, defaultValue: "")
        type = values.decodeIfPresent(forKey: .type, defaultValue: "")
        pendingPostId = values.decodeIfPresent(forKey: .pendingPostId, defaultValue: "")
        lastReplyAt = values.decodeIfPresent(forKey: .lastReplyAt, defaultValue: 0)
        replyCount = values.decodeIfPresent(forKey: .replyCount, defaultValue: 0)
        isFollowing = values.decodeIfPresent(forKey: .isFollowing, defaultValue: false)
        
        participants = (try? values.decodeIfPresent([User].self, forKey: .participants)) ?? nil

        if let meta = try? values.decode([String:Any].self, forKey: .metadata) {
            metadata = Database.default.json(from: meta) ?? "{}"
        } else {
            metadata = "{}"
        }
        
        if let propsData = try? values.decode([String:Any].self, forKey: .props) {
            props = propsData
        } else {
            props = [:]
        }
    }
    
    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: PostKeys.self)
        try container.encode(self.id, forKey: .id)
        try container.encode(self.createAt, forKey: .createAt)
        try container.encode(self.updateAt, forKey: .updateAt)
        try container.encode(self.editAt, forKey: .editAt)
        try container.encode(self.deleteAt, forKey: .deleteAt)
        try container.encode(self.isPinned, forKey: .isPinned)
        try container.encode(self.userId, forKey: .userId)
        try container.encode(self.channelId, forKey: .channelId)
        try container.encode(self.rootId, forKey: .rootId)
        try container.encode(self.originalId, forKey: .originalId)
        try container.encode(self.message, forKey: .message)
        try container.encodeIfPresent(self.messageSource, forKey: .messageSource)
        try container.encode(self.type, forKey: .type)
        try container.encode(self.props, forKey: .props)
        try container.encode(self.pendingPostId, forKey: .pendingPostId)
        try container.encode(self.metadata, forKey: .metadata)
        try container.encode(self.prevPostId, forKey: .prevPostId)
        try container.encodeIfPresent(self.participants, forKey: .participants)
        try container.encode(self.lastReplyAt, forKey: .lastReplyAt)
        try container.encode(self.replyCount, forKey: .replyCount)
        try container.encode(self.isFollowing, forKey: .isFollowing)
    }
}
