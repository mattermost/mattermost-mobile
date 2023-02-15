import Foundation

public struct CategoriesWithOrder: Codable {
    let order: [String]
    let categories: [Category]
    
    public enum CategoriesWithOrderKeys: String, CodingKey {
        case order, categories
    }
    
    public init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: CategoriesWithOrderKeys.self)
        order = values.decodeIfPresent(forKey: .order, defaultValue: [String]())
        categories = (try? values.decode([Category].self, forKey: .categories)) ?? [Category]()
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CategoriesWithOrderKeys.self)
        try container.encode(self.order, forKey: .order)
        try container.encode(self.categories, forKey: .categories)
    }
}

public struct Category: Codable {
    let id: String
    let channelIds: [String]
    let collapsed: Bool
    let displayName: String
    let muted: Bool
    let sortOrder: Int
    let sorting: String
    let teamId: String
    let type: String
    let userId: String
    
    public enum CategoryKeys: String, CodingKey {
        case id, collapsed, muted, sorting, type
        case channelIds = "channel_ids"
        case displayName = "display_name"
        case sortOrder = "sort_order"
        case teamId = "team_id"
        case userId = "user_id"
    }
    
    public init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: CategoryKeys.self)
        id = try values.decode(String.self, forKey: .id)
        teamId = try values.decode(String.self, forKey: .teamId)
        userId = try values.decode(String.self, forKey: .userId)
        channelIds = values.decodeIfPresent(forKey: .channelIds, defaultValue: [String]())
        collapsed = false
        displayName = values.decodeIfPresent(forKey: .displayName, defaultValue: "")
        muted = values.decodeIfPresent(forKey: .muted, defaultValue: false)
        sortOrder = values.decodeIfPresent(forKey: .sortOrder, defaultValue: 0)
        sorting = values.decodeIfPresent(forKey: .sorting, defaultValue: "recent")
        type = values.decodeIfPresent(forKey: .type, defaultValue: "custom")
    }
    
    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CategoryKeys.self)
        try container.encode(self.id, forKey: .id)
        try container.encode(self.channelIds, forKey: .channelIds)
        try container.encode(self.collapsed, forKey: .collapsed)
        try container.encode(self.displayName, forKey: .displayName)
        try container.encode(self.muted, forKey: .muted)
        try container.encode(self.sortOrder, forKey: .sortOrder)
        try container.encode(self.sorting, forKey: .sorting)
        try container.encode(self.teamId, forKey: .teamId)
        try container.encode(self.type, forKey: .type)
        try container.encode(self.userId, forKey: .userId)
    }
}

public struct CategoryChannel: Codable {
    let id: String
    let categoryId: String
    let channelId: String
    let sortOrder: Int
    
    public enum CategoryChannelKeys: String, CodingKey {
        case id
        case channelId = "channel_id"
        case categoryId = "category_id"
        case sortOrder = "sort_order"
    }
    
    public init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: CategoryChannelKeys.self)
        id = try values.decode(String.self, forKey: .id)
        channelId = try values.decode(String.self, forKey: .channelId)
        categoryId = try values.decode(String.self, forKey: .categoryId)
        sortOrder = values.decodeIfPresent(forKey: .sortOrder, defaultValue: 0)
    }
    
    public init(id: String, categoryId: String, channelId: String, sortOrder: Int = 0) {
        self.id = id
        self.categoryId = categoryId
        self.channelId = channelId
        self.sortOrder = sortOrder
    }
    
    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CategoryChannelKeys.self)
        try container.encode(self.id, forKey: .id)
        try container.encode(self.channelId, forKey: .channelId)
        try container.encode(self.categoryId, forKey: .categoryId)
        try container.encode(self.sortOrder, forKey: .sortOrder)
    }
}
