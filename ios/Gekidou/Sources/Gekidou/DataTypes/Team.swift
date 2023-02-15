import Foundation

public struct Team: Codable {
    let id: String
    let allowOpenInvite: Bool
    let allowedDomains: String
    let cloudLimitsArchived: Bool
    let companyName: String
    let createAt: Double
    let deleteAt: Double
    let description: String
    let displayName: String
    let email: String
    let groupConstrained: Bool
    let inviteId: String
    let lastTeamIconUpdate: Double
    let name: String
    let policyId: String
    let schemeId: String?
    let type: String
    let updateAt: Double
    
    
    public enum TeamKeys: String, CodingKey {
        case id
        case allowOpenInvite = "allow_open_invite"
        case allowedDomains = "allowed_domains"
        case cloudLimitsArchived = "cloud_limits_archive"
        case companyName = "company_name"
        case createAt = "create_at"
        case deleteAt = "delete_at"
        case description
        case displayName = "display_name"
        case email
        case groupConstrained = "group_constrained"
        case inviteId = "invite_id"
        case lastTeamIconUpdate = "last_team_icon_update"
        case name
        case policyId = "policy_id"
        case schemeId = "scheme_id"
        case type
        case updateAt = "update_at"
    }
    
    public init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: TeamKeys.self)
        id  = try values.decode(String.self, forKey: .id)
        allowOpenInvite = values.decodeIfPresent(forKey: .allowOpenInvite, defaultValue: true)
        allowedDomains = values.decodeIfPresent(forKey: .allowedDomains, defaultValue: "")
        cloudLimitsArchived = values.decodeIfPresent(forKey: .cloudLimitsArchived, defaultValue: false)
        companyName = values.decodeIfPresent(forKey: .companyName, defaultValue: "")
        createAt = values.decodeIfPresent(forKey: .createAt, defaultValue: 0)
        deleteAt = values.decodeIfPresent(forKey: .deleteAt, defaultValue: 0)
        description = values.decodeIfPresent(forKey: .description, defaultValue: "")
        displayName = values.decodeIfPresent(forKey: .displayName, defaultValue: "")
        email = values.decodeIfPresent(forKey: .email, defaultValue: "")
        groupConstrained = values.decodeIfPresent(forKey: .groupConstrained, defaultValue: false)
        inviteId = values.decodeIfPresent(forKey: .inviteId, defaultValue: "")
        lastTeamIconUpdate = values.decodeIfPresent(forKey: .lastTeamIconUpdate, defaultValue: 0)
        name = values.decodeIfPresent(forKey: .name, defaultValue: "")
        policyId = values.decodeIfPresent(forKey: .policyId, defaultValue: "")
        schemeId = values.decodeIfPresent(forKey: .schemeId, defaultValue: "")
        type = values.decodeIfPresent(forKey: .type, defaultValue: "O")
        updateAt = values.decodeIfPresent(forKey: .updateAt, defaultValue: 0)
    }
    
    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: TeamKeys.self)
        try container.encode(self.id, forKey: .id)
        try container.encode(self.allowOpenInvite, forKey: .allowOpenInvite)
        try container.encode(self.allowedDomains, forKey: .allowedDomains)
        try container.encode(self.cloudLimitsArchived, forKey: .cloudLimitsArchived)
        try container.encode(self.companyName, forKey: .companyName)
        try container.encode(self.createAt, forKey: .createAt)
        try container.encode(self.deleteAt, forKey: .deleteAt)
        try container.encode(self.description, forKey: .description)
        try container.encode(self.displayName, forKey: .displayName)
        try container.encode(self.email, forKey: .email)
        try container.encode(self.groupConstrained, forKey: .groupConstrained)
        try container.encode(self.inviteId, forKey: .inviteId)
        try container.encode(self.lastTeamIconUpdate, forKey: .lastTeamIconUpdate)
        try container.encode(self.name, forKey: .name)
        try container.encode(self.policyId, forKey: .policyId)
        try container.encodeIfPresent(self.schemeId, forKey: .schemeId)
        try container.encode(self.type, forKey: .type)
        try container.encode(self.updateAt, forKey: .updateAt)
    }
}
