import Foundation

public struct TeamMember: Codable {
    let id: String
    let explicitRoles: String
    let roles: String
    let schemeAdmin: Bool
    let schemeGuest: Bool
    let schemeUser: Bool
    let userId: String
    
    public enum TeamMemberKeys: String, CodingKey {
        case id = "team_id"
        case explicitRoles = "explicit_roles"
        case roles
        case schemeAdmin = "scheme_admin"
        case schemeGuest = "scheme_guest"
        case schemeUser = "scheme_user"
        case userId = "user_id"
    }
    
    public init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: TeamMemberKeys.self)
        id  = try values.decode(String.self, forKey: .id)
        userId = try values.decode(String.self, forKey: .userId)
        explicitRoles = values.decodeIfPresent(forKey: .explicitRoles, defaultValue: "")
        roles = values.decodeIfPresent(forKey: .roles, defaultValue: "")
        schemeAdmin = values.decodeIfPresent(forKey: .schemeAdmin, defaultValue: false)
        schemeGuest = values.decodeIfPresent(forKey: .schemeGuest, defaultValue: false)
        schemeUser = values.decodeIfPresent(forKey: .schemeUser, defaultValue: true)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: TeamMemberKeys.self)
        try container.encode(self.id, forKey: .id)
        try container.encode(self.explicitRoles, forKey: .explicitRoles)
        try container.encode(self.roles, forKey: .roles)
        try container.encode(self.schemeAdmin, forKey: .schemeAdmin)
        try container.encode(self.schemeGuest, forKey: .schemeGuest)
        try container.encode(self.schemeUser, forKey: .schemeUser)
        try container.encode(self.userId, forKey: .userId)
    }
}
