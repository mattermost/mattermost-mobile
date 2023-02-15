import Foundation

public struct Channel: Codable {
    let id: String
    let createAt: Double
    let creatorId: String
    let deleteAt: Double
    var displayName: String = ""
    let extraUpdateAt: Double
    let groupConstrained: Bool
    let header: String
    let lastPostAt: Double
    let lastRootPostAt: Double
    let name: String
    let policyId: String
    let props: String
    let purpose: String
    let schemeId: String
    let shared: Bool
    let teamId: String
    let totalMsgCount: Int
    let totalMsgCountRoot: Int
    let type: String
    let updateAt: Double
    
    public enum ChannelKeys: String, CodingKey {
        case id
        case createAt = "create_at"
        case creatorId = "creator_id"
        case deleteAt = "delete_at"
        case displayName = "display_name"
        case extraUpdateAt = "extra_update_at"
        case groupConstrained = "group_constrained"
        case header
        case lastPostAt = "last_post_at"
        case lastRootPostAt = "last_root_post_at"
        case name
        case policyId = "policy_id"
        case props
        case purpose
        case schemeId = "scheme_id"
        case shared
        case teamId = "team_id"
        case totalMsgCount = "total_msg_count"
        case totalMsgCountRoot = "total_msg_count_root"
        case type
        case updateAt = "update_at"
    }
    
    public init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: ChannelKeys.self)
        id  = try values.decode(String.self, forKey: .id)
        creatorId = values.decodeIfPresent(forKey: .creatorId, defaultValue: "")
        createAt = values.decodeIfPresent(forKey: .createAt, defaultValue: 0)
        deleteAt = values.decodeIfPresent(forKey: .deleteAt, defaultValue: 0)
        displayName = values.decodeIfPresent(forKey: .displayName, defaultValue: "")
        extraUpdateAt = values.decodeIfPresent(forKey: .extraUpdateAt, defaultValue: 0)
        groupConstrained = values.decodeIfPresent(forKey: .groupConstrained, defaultValue: false)
        header = values.decodeIfPresent(forKey: .header, defaultValue: "")
        lastPostAt = values.decodeIfPresent(forKey: .lastPostAt, defaultValue: 0)
        lastRootPostAt = values.decodeIfPresent(forKey: .lastRootPostAt, defaultValue: 0)
        name = values.decodeIfPresent(forKey: .name, defaultValue: "")
        policyId = values.decodeIfPresent(forKey: .policyId, defaultValue: "")
        let propsData = try? values.decode([String:Any].self, forKey: .props)
        props = Database.default.json(from: propsData) ?? "{}"
        purpose = values.decodeIfPresent(forKey: .purpose, defaultValue: "")
        schemeId = values.decodeIfPresent(forKey: .schemeId, defaultValue: "")
        shared = values.decodeIfPresent(forKey: .shared, defaultValue: false)
        teamId = values.decodeIfPresent(forKey: .teamId, defaultValue: "")
        totalMsgCount = values.decodeIfPresent(forKey: .totalMsgCount, defaultValue: 0)
        totalMsgCountRoot = values.decodeIfPresent(forKey: .totalMsgCountRoot, defaultValue: 0)
        type = values.decodeIfPresent(forKey: .type, defaultValue: "O")
        updateAt = values.decodeIfPresent(forKey: .updateAt, defaultValue: 0)
    }
    
    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: ChannelKeys.self)
        try container.encode(self.id, forKey: .id)
        try container.encode(self.creatorId, forKey: .creatorId)
        try container.encode(self.createAt, forKey: .createAt)
        try container.encode(self.deleteAt, forKey: .deleteAt)
        try container.encode(self.displayName, forKey: .displayName)
        try container.encode(self.extraUpdateAt, forKey: .extraUpdateAt)
        try container.encode(self.groupConstrained, forKey: .groupConstrained)
        try container.encode(self.header, forKey: .header)
        try container.encode(self.lastPostAt, forKey: .lastPostAt)
        try container.encode(self.lastRootPostAt, forKey: .lastRootPostAt)
        try container.encode(self.name, forKey: .name)
        try container.encode(self.policyId, forKey: .policyId)
        try container.encode(self.props, forKey: .props)
        try container.encode(self.purpose, forKey: .purpose)
        try container.encode(self.schemeId, forKey: .schemeId)
        try container.encode(self.shared, forKey: .shared)
        try container.encode(self.teamId, forKey: .teamId)
        try container.encode(self.totalMsgCount, forKey: .totalMsgCount)
        try container.encode(self.totalMsgCountRoot, forKey: .totalMsgCountRoot)
        try container.encode(self.type, forKey: .type)
        try container.encode(self.updateAt, forKey: .updateAt)
    }
}
