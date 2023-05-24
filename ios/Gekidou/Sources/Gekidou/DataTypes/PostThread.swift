import Foundation

public struct PostThread: Codable {
    let id: String
    var lastReplyAt: Double
    var lastViewedAt: Double
    let replyCount: Int
    var unreadReplies: Int
    var unreadMentions: Int
    let post: Post?
    let participants: [User]
    let isFollowing: Bool
    let deleteAt: Double
    
    public enum PostThreadKeys: String, CodingKey {
        case id, post, participants
        case lastReplyAt = "last_reply_at"
        case lastViewedAt = "last_viewed_at"
        case replyCount = "reply_count"
        case unreadReplies = "unread_replies"
        case unreadMentions = "unread_mentions"
        case isFollowing = "is_following"
        case deleteAt = "delete_at"
    }
    
    public init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: PostThreadKeys.self)
        id = try values.decode(String.self, forKey: .id)
        post = values.decodeIfPresent(forKey: .post, defaultValue: nil)
        participants = values.decodeIfPresent(forKey: .participants, defaultValue: [User]())
        lastReplyAt = values.decodeIfPresent(forKey: .lastReplyAt, defaultValue: 0)
        lastViewedAt = values.decodeIfPresent(forKey: .lastViewedAt, defaultValue: 0)
        replyCount = values.decodeIfPresent(forKey: .replyCount, defaultValue: 0)
        unreadReplies = values.decodeIfPresent(forKey: .unreadReplies, defaultValue: 0)
        unreadMentions = values.decodeIfPresent(forKey: .unreadMentions, defaultValue: 0)
        isFollowing = values.decodeIfPresent(forKey: .isFollowing, defaultValue: false)
        deleteAt = values.decodeIfPresent(forKey: .deleteAt, defaultValue: 0)
    }
    
    public init(from post: Post) {
        id = post.id
        replyCount = post.replyCount
        participants = post.participants ?? [User]()
        isFollowing = post.isFollowing
        deleteAt = post.deleteAt
        lastReplyAt = 0
        lastViewedAt = 0
        unreadReplies = 0
        unreadMentions = 0
        self.post = post
    }
    
    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: PostThreadKeys.self)
        try container.encode(self.id, forKey: .id)
        try container.encode(self.lastReplyAt, forKey: .lastReplyAt)
        try container.encode(self.lastViewedAt, forKey: .lastViewedAt)
        try container.encode(self.replyCount, forKey: .replyCount)
        try container.encode(self.unreadReplies, forKey: .unreadReplies)
        try container.encode(self.unreadMentions, forKey: .unreadMentions)
        try container.encodeIfPresent(self.post, forKey: .post)
        try container.encode(self.participants, forKey: .participants)
        try container.encode(self.isFollowing, forKey: .isFollowing)
        try container.encode(self.deleteAt, forKey: .deleteAt)
    }
}
