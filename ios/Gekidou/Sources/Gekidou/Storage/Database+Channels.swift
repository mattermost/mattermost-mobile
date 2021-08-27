//
//  Database+Channels.swift
//  
//
//  Created by Miguel Alatzar on 8/27/21.
//

import Foundation
import SQLite

public struct Channel: Codable {
    let id: String
    let create_at: Int64
    let update_at: Int64
    let delete_at: Int64
    let team_id: String
    let type: String
    let display_name: String
    let name: String
    let creator_id: String
    
    // TODO: There are not in the DB
    let header: String
    let purpose: String
    let last_post_at: Int64
    let total_msg_count: Int64
    let extra_update_at: Int64
}

extension Database {
    public func hasChannel(withId channelId: String, withServerUrl serverUrl: String) throws -> Bool {
        let db = try getDatabaseForServer(serverUrl)
        
        let idCol = Expression<String>("id")
        let query = channelTable.where(idCol == channelId)
        
        if let _ = try db.pluck(query) {
            return true
        }
        
        return false
    }
    
    public func insertChannel(_ channel: Channel, _ serverUrl: String) throws {
        let db = try getDatabaseForServer(serverUrl)
        
        let setter = createChannelSetter(from: channel)
        let insertQuery = channelTable.insert(or: .replace, setter)
        try db.run(insertQuery)
    }
    
    private func createChannelSetter(from channel: Channel) -> [Setter] {
        let id = Expression<String>("id")
        let createAt = Expression<Int64>("create_at")
        let updateAt = Expression<Int64>("update_at")
        let deleteAt = Expression<Int64>("delete_at")
        let teamId = Expression<String>("team_id")
        let type = Expression<String>("type")
        let displayName = Expression<String>("display_name")
        let name = Expression<String>("name")
        let creatorId = Expression<String>("creator_id")
        
        var setter = [Setter]()
        setter.append(id <- channel.id)
        setter.append(createAt <- channel.create_at)
        setter.append(updateAt <- channel.update_at)
        setter.append(deleteAt <- channel.delete_at)
        setter.append(teamId <- channel.team_id)
        setter.append(type <- channel.type)
        setter.append(displayName <- channel.display_name)
        setter.append(name <- channel.name)
        setter.append(creatorId <- channel.creator_id)
        
        return setter
    }
}
