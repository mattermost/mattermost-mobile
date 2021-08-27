//
//  Database+Teams.swift
//  
//
//  Created by Miguel Alatzar on 8/27/21.
//

import Foundation
import SQLite

public struct Team: Codable {
    let id: String
    let update_at: Int64
    let display_name: String
    let name: String
    let description: String
    let type: String
    let allowed_domains: String
    let allow_open_invite: Bool
    
    // TODO: These are not in the db.
    let create_at: Int64
    let delete_at: Int64
    let email: String
    let invite_id: String
    let policy_id: String
}

extension Database {
    public func hasTeam(withId teamId: String, withServerUrl serverUrl: String) throws -> Bool {
        let db = try getDatabaseForServer(serverUrl)
        
        let idCol = Expression<String>("id")
        let query = teamTable.where(idCol == teamId)
        
        if let _ = try db.pluck(query) {
            return true
        }
        
        return false
    }
    
    public func insertTeam(_ team: Team, _ serverUrl: String) throws {
        let db = try getDatabaseForServer(serverUrl)
        
        let setter = createTeamSetter(from: team)
        let insertQuery = teamTable.insert(or: .replace, setter)
        try db.run(insertQuery)
    }
    
    private func createTeamSetter(from team: Team) -> [Setter] {
        let id = Expression<String>("id")
        let updateAt = Expression<Int64>("update_at")
        let displayName = Expression<String>("display_name")
        let name = Expression<String>("name")
        let description = Expression<String>("description")
        let type = Expression<String>("type")
        let allowedDomains = Expression<String>("allowed_domains")
        let isAllowOpenInvite = Expression<Bool>("is_allow_open_invite")
        
        var setter = [Setter]()
        setter.append(id <- team.id)
        setter.append(updateAt <- team.update_at)
        setter.append(displayName <- team.display_name)
        setter.append(name <- team.name)
        setter.append(description <- team.description)
        setter.append(type <- team.type)
        setter.append(allowedDomains <- team.allowed_domains)
        setter.append(isAllowOpenInvite <- team.allow_open_invite)
        
        return setter
    }
}
