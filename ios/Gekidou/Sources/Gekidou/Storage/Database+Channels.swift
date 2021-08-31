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
    let header: String
    let purpose: String
    let total_msg_count: Int64
}

public struct ChannelMembership: Codable {
    let channel_id: String
    let user_id: String
    let roles: String
    let last_viewed_at: Int64
    let mention_count: Int64
    let msg_count: Int64
    let notify_props: [String:String]
}

extension Database {
    public func queryChannel(withId channelId: String, withServerUrl serverUrl: String) throws -> Row? {
        let db = try getDatabaseForServer(serverUrl)
        
        let idCol = Expression<String>("id")
        let query = channelTable.where(idCol == channelId)
        
        return try db.pluck(query)
    }
    
    public func queryMyChannel(withId channelId: String, withServerUrl serverUrl: String) throws -> Row? {
        let db = try getDatabaseForServer(serverUrl)
        
        let idCol = Expression<String>("id")
        let query = myChannelTable.where(idCol == channelId)
        
        return try db.pluck(query)
    }
    
    public func insertChannel(_ channel: Channel, _ serverUrl: String) throws {
        let db = try getDatabaseForServer(serverUrl)
        
        let setter = createChannelSetter(from: channel)
        let query = channelTable.insert(or: .replace, setter)
        try db.run(query)
    }
    
    public func insertChannelInfo(_ channel: Channel, _ serverUrl: String) throws {
        let db = try getDatabaseForServer(serverUrl)
        
        let setter = createChannelInfoSetter(from: channel)
        let query = channelInfoTable.insert(or: .replace, setter)
        try db.run(query)
    }
    
    public func insertMyChannel(_ channelMembership: ChannelMembership, _ serverUrl: String) throws {
        let db = try getDatabaseForServer(serverUrl)
        
        let setter = createMyChannelSetter(from: channelMembership)
        let query = myChannelTable.insert(or: .replace, setter)
        try db.run(query)
    }
    
    public func insertMyChannelSettings(_ channelMembership: ChannelMembership, _ serverUrl: String) throws {
        let db = try getDatabaseForServer(serverUrl)
        
        let setter = createMyChannelSettingsSetter(from: channelMembership)
        let query = myChannelSettingsTable.insert(or: .replace, setter)
        try db.run(query)
    }
    
    public func insertChannelMembership(_ channelMembership: ChannelMembership, _ serverUrl: String) throws {
        let db = try getDatabaseForServer(serverUrl)
        
        let setter = createChannelMembershipSetter(from: channelMembership)
        let query = channelMembershipTable.insert(or: .replace, setter)
        try db.run(query)
    }
    
    public func handleChannelAndMembership(_ channel: Channel?, _ channelMembership: ChannelMembership?, _ serverUrl: String) throws {
        if let channel = channel {
            try insertChannel(channel, serverUrl)
            try insertChannelInfo(channel, serverUrl)
        }
        
        if let channelMembership = channelMembership {
            try insertMyChannel(channelMembership, serverUrl)
            try insertMyChannelSettings(channelMembership, serverUrl)
            try insertChannelMembership(channelMembership, serverUrl)
        }
        
        try updateMyChannelMessageCount(channel, channelMembership, serverUrl)
    }
    
    private func updateMyChannelMessageCount(_ channel: Channel?, _ channelMembership: ChannelMembership?, _ serverUrl: String) throws {
        if let channel = channel, let channelMembership = channelMembership {
            let db = try getDatabaseForServer(serverUrl)
            
            let messageCount = channel.total_msg_count - channelMembership.msg_count
            let idCol = Expression<String>("id")
            let messageCountCol = Expression<Int64>("message_count")
            let query = myChannelTable
                .where(idCol == channel.id)
                .update(messageCountCol <- messageCount)
            
            try db.run(query)
        }
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
    
    private func createChannelInfoSetter(from channel: Channel) -> [Setter] {
        let id = Expression<String>("id")
        let header = Expression<String>("header")
        let purpose = Expression<String>("purpose")
        
        var setter = [Setter]()
        setter.append(id <- channel.id)
        setter.append(header <- channel.header)
        setter.append(purpose <- channel.purpose)
        
        return setter
    }
    
    private func createMyChannelSetter(from channelMembership: ChannelMembership) -> [Setter] {
        let id = Expression<String>("id")
        let roles = Expression<String>("roles")
        let lastViewedAt = Expression<Int64>("last_viewed_at")
        let mentionsCount = Expression<Int64>("mentions_count")
        
        var setter = [Setter]()
        setter.append(id <- channelMembership.channel_id)
        setter.append(roles <- channelMembership.roles)
        setter.append(lastViewedAt <- channelMembership.last_viewed_at)
        setter.append(mentionsCount <- channelMembership.mention_count)
        
        return setter
    }
    
    private func createMyChannelSettingsSetter(from channelMembership: ChannelMembership) -> [Setter] {
        let id = Expression<String>("id")
        let notifyProps = Expression<String>("notify_props")
        
        let notifyPropsJSON = try! JSONSerialization.data(withJSONObject: channelMembership.notify_props, options: [])
        let notifyPropsString = String(data: notifyPropsJSON, encoding: String.Encoding.utf8)!
        
        var setter = [Setter]()
        setter.append(id <- channelMembership.channel_id)
        setter.append(notifyProps <- notifyPropsString)
        
        return setter
    }
    
    private func createChannelMembershipSetter(from channelMembership: ChannelMembership) -> [Setter] {
        let id = Expression<String>("id")
        let channelId = Expression<String>("channel_id")
        let userId = Expression<String>("user_id")
        
        var setter = [Setter]()
        setter.append(id <- channelMembership.channel_id)
        setter.append(channelId <- channelMembership.channel_id)
        setter.append(userId <- channelMembership.user_id)
        
        return setter
    }
}
