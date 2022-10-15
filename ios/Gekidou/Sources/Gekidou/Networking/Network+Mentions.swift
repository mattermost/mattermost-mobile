import Foundation

public struct ChannelMemberData: Codable {
    let channel_id: String
    let mention_count: Int
    let mention_count_root: Int
    let user_id: String
    let roles: String
    let last_viewed_at: Int64
    let last_update_at: Int64
    
    public enum ChannelMemberKeys: String, CodingKey {
        case channel_id, mention_count, mention_count_root, user_id, roles, last_viewed_at, last_update_at
    }
    
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: ChannelMemberKeys.self)
        channel_id = try container.decode(String.self, forKey: .channel_id)
        mention_count = try container.decode(Int.self, forKey: .mention_count)
        let mentions_root = try? container.decode(Int?.self, forKey: .mention_count_root) ?? 0
        mention_count_root = mentions_root!
        user_id = try container.decode(String.self, forKey: .user_id)
        roles = try container.decode(String.self, forKey: .roles)
        last_update_at = try container.decode(Int64.self, forKey: .last_update_at)
        last_viewed_at = try container.decode(Int64.self, forKey: .last_viewed_at)
    }
}

public struct ThreadData: Codable {
    let id: String
    let last_reply_at: Int64
    let last_viewed_at: Int64
    let reply_count: Int
    let unread_replies: Int
    let unread_mentions: Int
    
    public enum ThreadKeys: String, CodingKey {
        case id, last_reply_at, last_viewed_at, reply_count, unread_replies, unread_mentions
    }
    
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: ThreadKeys.self)
        id = try container.decode(String.self, forKey: .id)
        last_viewed_at = try container.decode(Int64.self, forKey: .last_viewed_at)
        last_reply_at = try container.decode(Int64.self, forKey: .last_reply_at)
        reply_count = try container.decode(Int.self, forKey: .reply_count)
        unread_replies = try container.decode(Int.self, forKey: .unread_replies)
        unread_mentions = try container.decode(Int.self, forKey: .unread_mentions)
    }
}

extension Network {
    public func fetchChannelMentions(channelId: String, withServerUrl serverUrl: String, completionHandler: @escaping ResponseHandler) {
        let endpoint = "/channels/\(channelId)/members/me"
        let url = buildApiUrl(serverUrl, endpoint)
        return request(url, withMethod: "GET", withServerUrl: serverUrl, completionHandler: completionHandler)
    }
    
    public func fetchThreadMentions(teamId: String, threadId: String, withServerUrl serverUrl: String, completionHandler: @escaping ResponseHandler) {
        let endpoint = "/users/me/teams/\(teamId)/threads/\(threadId)"
        let url = buildApiUrl(serverUrl, endpoint)
        return request(url, withMethod: "GET", withServerUrl: serverUrl, completionHandler: completionHandler)
    }
}
