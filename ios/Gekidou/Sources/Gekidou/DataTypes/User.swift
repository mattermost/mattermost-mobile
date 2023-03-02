import Foundation

public struct User: Codable, Hashable {
    let id: String
    let authService: String
    let updateAt: Double
    let deleteAt: Double
    let email: String
    let firstName: String
    let isBot: Bool
    let isGuest: Bool
    let lastName: String
    let lastPictureUpdate: Double
    let locale: String
    let nickname: String
    let position: String
    let roles: String
    let status: String
    let username: String
    let notifyProps: String
    let props: String
    let timezone: String
    
    public enum UserKeys: String, CodingKey {
        case id, email, locale, nickname, position, roles, username, props, timezone, status
        case authService = "auth_service"
        case updateAt = "update_at"
        case deleteAt = "delete_at"
        case firstName = "first_name"
        case isBot = "is_bot"
        case lastName = "last_name"
        case lastPictureUpdate = "last_picture_update"
        case notifyProps = "notify_props"
        case isGuest = "is_guest"
    }
    
    public init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: UserKeys.self)
        id = try values.decode(String.self, forKey: .id)
        username = try values.decode(String.self, forKey: .username)
        authService = values.decodeIfPresent(forKey: .authService, defaultValue: "")
        updateAt = values.decodeIfPresent(forKey: .updateAt, defaultValue: 0)
        deleteAt = values.decodeIfPresent(forKey: .deleteAt, defaultValue: 0)
        email = values.decodeIfPresent(forKey: .email, defaultValue: "")
        firstName = values.decodeIfPresent(forKey: .firstName, defaultValue: "")
        isBot = values.decodeIfPresent(forKey: .isBot, defaultValue: false)
        roles = values.decodeIfPresent(forKey: .roles, defaultValue: "")
        lastName = values.decodeIfPresent(forKey: .lastName, defaultValue: "")
        lastPictureUpdate = values.decodeIfPresent(forKey: .lastPictureUpdate, defaultValue: 0)
        locale = values.decodeIfPresent(forKey: .locale, defaultValue: "en")
        nickname = values.decodeIfPresent(forKey: .nickname, defaultValue: "")
        position = values.decodeIfPresent(forKey: .position, defaultValue: "")
        
        isGuest = roles.contains("system_guest")
        status = "offline"
        
        if let notifyPropsData = try? values.decodeIfPresent([String: String].self, forKey: .notifyProps) {
            notifyProps = Database.default.json(from: notifyPropsData) ?? "{}"
        } else {
            notifyProps = "{}"
        }

        if let propsData = try? values.decodeIfPresent([String: String].self, forKey: .props) {
            props = Database.default.json(from: propsData) ?? "{}"
        } else {
            props = "{}"
        }

        if let timezoneData = try? values.decodeIfPresent([String: String].self, forKey: .timezone) {
            timezone = Database.default.json(from: timezoneData) ?? "{}"
        } else {
            timezone = "{}"
        }
    }
    
    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: UserKeys.self)
        try container.encode(self.id, forKey: .id)
        try container.encode(self.authService, forKey: .authService)
        try container.encode(self.updateAt, forKey: .updateAt)
        try container.encode(self.deleteAt, forKey: .deleteAt)
        try container.encode(self.email, forKey: .email)
        try container.encode(self.firstName, forKey: .firstName)
        try container.encode(self.isBot, forKey: .isBot)
        try container.encode(self.isGuest, forKey: .isGuest)
        try container.encode(self.lastName, forKey: .lastName)
        try container.encode(self.lastPictureUpdate, forKey: .lastPictureUpdate)
        try container.encode(self.locale, forKey: .locale)
        try container.encode(self.nickname, forKey: .nickname)
        try container.encode(self.position, forKey: .position)
        try container.encode(self.roles, forKey: .roles)
        try container.encode(self.status, forKey: .status)
        try container.encode(self.username, forKey: .username)
        try container.encode(self.notifyProps, forKey: .notifyProps)
        try container.encode(self.props, forKey: .props)
        try container.encode(self.timezone, forKey: .timezone)
    }
}
