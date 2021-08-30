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
    let policy_id: String
}

public struct TeamMembership: Codable {
    let team_id: String
    let user_id: String
    let roles: String
    let delete_at: Int64
    let scheme_user: Bool
    let scheme_admin: Bool
    let explicit_roles: String
}

extension Database {
    public func hasMyTeam(withId teamId: String, withServerUrl serverUrl: String) throws -> Bool {
        let db = try getDatabaseForServer(serverUrl)
        
        let idCol = Expression<String>("id")
        let query = myTeamTable.where(idCol == teamId)
        
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
    
    public func insertMyTeam(_ teamMembership: TeamMembership, _ serverUrl: String) throws {
        let db = try getDatabaseForServer(serverUrl)
        
        let setter = createMyTeamSetter(from: teamMembership)
        let insertQuery = myTeamTable.insert(or: .replace, setter)
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
        let policyId = Expression<String>("policy_id")
        
        var setter = [Setter]()
        setter.append(id <- team.id)
        setter.append(updateAt <- team.update_at)
        setter.append(displayName <- team.display_name)
        setter.append(name <- team.name)
        setter.append(description <- team.description)
        setter.append(type <- team.type)
        setter.append(allowedDomains <- team.allowed_domains)
        setter.append(isAllowOpenInvite <- team.allow_open_invite)
        
        // TODO: policyId is not yet in the Team table
        // setter.append(policyId <- team.policy_id)
        
        return setter
    }
    
    private func createMyTeamSetter(from teamMembership: TeamMembership) -> [Setter] {
        let teamId = Expression<String>("team_id")
        let roles = Expression<String>("roles")
        
        var setter = [Setter]()
        setter.append(teamId <- teamMembership.team_id)
        setter.append(roles <- teamMembership.roles)
        
        return setter
    }
}
