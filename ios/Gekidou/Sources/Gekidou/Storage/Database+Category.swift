import Foundation
import SQLite

extension Database {
    public func queryCategoryId(inTeamId teamId: String, type: String, forServerUrl serverUrl: String) -> String? {
        if let db = try? getDatabaseForServer(serverUrl) {
            let idCol = Expression<String>("id")
            let teamIdCol = Expression<String>("team_id")
            let typeCol = Expression<String>("type")
            let query = categoryTable.where(teamIdCol == teamId && typeCol == type)
            if let result = try? db.pluck(query) {
                return try? result.get(idCol)
            }
        }

        return nil
    }
    
    public func queryCategoryChannelId(inCategoryId categoryId: String, channelId: String, forServerUrl serverUrl: String) -> String? {
        if let db = try? getDatabaseForServer(serverUrl) {
            let idCol = Expression<String>("id")
            let categoryIdCol = Expression<String>("category_id")
            let channelIdCol = Expression<String>("channel_id")
            let query = categoryChannelTable.where(categoryIdCol == categoryId && channelIdCol == channelId)
            if let result = try? db.pluck(query) {
                return try? result.get(idCol)
            }
        }
        return nil
    }

    
    public func insertCategoriesWithChannels(_ db: Connection, _ categoriesWithChannels: [Category]) throws {
        let categories = createCategoriesSetter(from: categoriesWithChannels)
        let categoryChannels = createCategoryChannelsSetter(from: categoriesWithChannels)
        try db.run(categoryTable.insertMany(or: .replace, categories))
        try db.run(categoryChannelTable.insertMany(or: .replace, categoryChannels))
    }
    
    public func insertChannelToDefaultCategory(_ db: Connection, _ categoryChannels: [CategoryChannel]) throws {
        let categoryId = Expression<String>("category_id")
        for cc in categoryChannels {
            let count = (try? db.scalar(categoryChannelTable.where(categoryId == cc.categoryId).count)) ?? 0
            let setter = createCategoryChannelsSetter(from: cc, index: count > 0 ? count + 1 : 0)
            try db.run(categoryChannelTable.insert(or: .replace, setter))
        }
    }
    
    private func createCategoriesSetter(from categories: [Category]) -> [[Setter]] {
        let id = Expression<String>("id")
        let collapsed = Expression<Bool>("collapsed")
        let displayName = Expression<String>("display_name")
        let muted = Expression<Bool>("muted")
        let sortOrder = Expression<Int>("sort_order")
        let sorting = Expression<String>("sorting")
        let teamId = Expression<String>("team_id")
        let type = Expression<String>("type")
        
        var setters = [[Setter]]()
        for category in categories {
            var setter = [Setter]()
            setter.append(id <- category.id)
            setter.append(collapsed <- category.collapsed)
            setter.append(displayName <- category.displayName)
            setter.append(muted <- category.muted)
            setter.append(sortOrder <- category.sortOrder / 10)
            setter.append(sorting <- category.sorting)
            setter.append(teamId <- category.teamId)
            setter.append(type <- category.type)
            setters.append(setter)
        }

        return setters
    }
    
    private func createCategoryChannelsSetter(from categories: [Category]) -> [[Setter]] {
        let id = Expression<String>("id")
        let categoryId = Expression<String>("category_id")
        let channelId = Expression<String>("channel_id")
        let sortOrder = Expression<Int>("sort_order")
        
        var setters = [[Setter]]()
        for category in categories {
            for (index, chId) in category.channelIds.enumerated() {
                var setter = [Setter]()
                setter.append(id <- "\(category.teamId)_\(chId)")
                setter.append(categoryId <- category.id)
                setter.append(channelId <- chId)
                setter.append(sortOrder <- index)
                setters.append(setter)
            }
        }

        return setters
    }
    
    private func createCategoryChannelsSetter(from categoryChannel: CategoryChannel, index: Int = 0) -> [Setter] {
        let id = Expression<String>("id")
        let categoryId = Expression<String>("category_id")
        let channelId = Expression<String>("channel_id")
        let sortOrder = Expression<Int>("sort_order")
        
        var setter = [Setter]()
        setter.append(id <- categoryChannel.id)
        setter.append(categoryId <- categoryChannel.categoryId)
        setter.append(channelId <- categoryChannel.channelId)
        setter.append(sortOrder <- index)

        return setter
    }
}
