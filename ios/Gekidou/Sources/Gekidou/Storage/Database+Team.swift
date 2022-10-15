import Foundation
import SQLite

extension Database {
    internal func queryCurrentTeamId(_ serverUrl: String) -> String? {
        if let db = try? getDatabaseForServer(serverUrl) {
            let idCol = Expression<String>("id")
            let valueCol = Expression<String>("value")
            let query = systemTable.where(idCol == "currentTeamId")
            
            if let result = try? db.pluck(query) {
                return try? result.get(valueCol).replacingOccurrences(of: "\"", with: "")
            }
        }
        
        return nil
    }
    
    public func queryTeamIdForChannel(withId channelId: String, withServerUrl serverUrl: String) -> String? {
        if let db = try? getDatabaseForServer(serverUrl) {
            let idCol = Expression<String>("id")
            let teamIdCol = Expression<String?>("team_id")
            let query = channelTable.where(idCol == channelId)
            
            if let result = try? db.pluck(query) {
                var teamId = result[teamIdCol]
                if teamId != nil || teamId!.isEmpty {
                   teamId = queryCurrentTeamId(serverUrl)
                }
                return teamId
            }
        }
        
        return nil
    }
}
