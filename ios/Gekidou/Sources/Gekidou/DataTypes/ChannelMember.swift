import Foundation

public struct ChannelMember: Codable {
    let id: String
    let explicitRoles: String
    let lastUpdateAt: Double
    let lastViewedAt: Double
    let mentionCount: Int
    let mentionCountRoot: Int
    let msgCount: Int
    let msgCountRoot: Int
    let notifyProps: String
    let roles: String
    let schemeAdmin: Bool
    let schemeGuest: Bool
    let schemeUser: Bool
    let urgentMentionCount: Int
    let userId: String
    var internalMsgCount: Int
    var internalMsgCountRoot: Int
    
    
    public enum ChannelMemberKeys: String, CodingKey {
        case internalMsgCount, internalMsgCountRoot
        case id = "channel_id"
        case explicitRoles = "explicit_roles"
        case lastUpdateAt = "last_update_at"
        case lastViewedAt = "last_viewed_at"
        case mentionCount = "mention_count"
        case mentionCountRoot = "mention_count_root"
        case msgCount = "msg_count"
        case msgCountRoot = "msg_count_root"
        case notifyProps = "notify_props"
        case roles
        case schemeAdmin = "scheme_admin"
        case schemeGuest = "scheme_guest"
        case schemeUser = "scheme_user"
        case urgentMentionCount = "urgent_mention_count"
        case userId = "user_id"
    }
    
    public init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: ChannelMemberKeys.self)
        id  = try values.decode(String.self, forKey: .id)
        userId  = try values.decode(String.self, forKey: .userId)
        explicitRoles = values.decodeIfPresent(forKey: .explicitRoles, defaultValue: "")
        lastUpdateAt = values.decodeIfPresent(forKey: .lastUpdateAt, defaultValue: 0)
        lastViewedAt = values.decodeIfPresent(forKey: .lastViewedAt, defaultValue: 0)
        mentionCount = values.decodeIfPresent(forKey: .mentionCount, defaultValue: 0)
        mentionCountRoot = values.decodeIfPresent(forKey: .mentionCountRoot, defaultValue: 0)
        msgCount = values.decodeIfPresent(forKey: .msgCount, defaultValue: 0)
        msgCountRoot = values.decodeIfPresent(forKey: .msgCountRoot, defaultValue: 0)
        let propsData = try values.decode([String:Any].self, forKey: .notifyProps)
        notifyProps = Database.default.json(from: propsData) ?? "{}"
        roles = values.decodeIfPresent(forKey: .roles, defaultValue: "")
        schemeAdmin = values.decodeIfPresent(forKey: .schemeAdmin, defaultValue: false)
        schemeGuest = values.decodeIfPresent(forKey: .schemeGuest, defaultValue: false)
        schemeUser = values.decodeIfPresent(forKey: .schemeUser, defaultValue: true)
        urgentMentionCount = values.decodeIfPresent(forKey: .urgentMentionCount, defaultValue: 0)
        internalMsgCount = 0
        internalMsgCountRoot = 0
    }
    
    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: ChannelMemberKeys.self)
        try container.encode(self.id, forKey: .id)
        try container.encode(self.explicitRoles, forKey: .explicitRoles)
        try container.encode(self.lastUpdateAt, forKey: .lastUpdateAt)
        try container.encode(self.lastViewedAt, forKey: .lastViewedAt)
        try container.encode(self.mentionCount, forKey: .mentionCount)
        try container.encode(self.mentionCountRoot, forKey: .mentionCountRoot)
        try container.encode(self.msgCount, forKey: .msgCount)
        try container.encode(self.msgCountRoot, forKey: .msgCountRoot)
        try container.encode(self.notifyProps, forKey: .notifyProps)
        try container.encode(self.roles, forKey: .roles)
        try container.encode(self.schemeAdmin, forKey: .schemeAdmin)
        try container.encode(self.schemeGuest, forKey: .schemeGuest)
        try container.encode(self.schemeUser, forKey: .schemeUser)
        try container.encode(self.urgentMentionCount, forKey: .urgentMentionCount)
        try container.encode(self.userId, forKey: .userId)
        try container.encode(self.internalMsgCount, forKey: .internalMsgCount)
        try container.encode(self.internalMsgCountRoot, forKey: .internalMsgCountRoot)
    }
}

