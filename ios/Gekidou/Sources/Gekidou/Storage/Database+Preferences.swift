import Foundation
import SQLite

extension Database {
    public func getTeammateDisplayNameSetting(_ serverUrl: String) -> String {
        do {
            if let displayName = geConfigDisplayNameSetting(serverUrl) {
                return displayName
            }

            let db = try getDatabaseForServer(serverUrl)
            let category = Expression<String>("category")
            let name = Expression<String>("name")
            let value = Expression<String>("value")
            let query = preferenceTable.select(value).filter(category == "display_settings" && name == "name_format")
            if let result = try db.pluck(query) {
                let val = try result.get(value)
                return val
            }
        } catch {
            // do nothing
        }
        
        return "username"
    }
}
