//
//  Database+Channels.swift
//  Gekidou
//  
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import Foundation
import SQLite

extension Database {
    internal func queryCurrentChannelId(_ serverUrl: String) throws -> String {
        let db = try getDatabaseForServer(serverUrl)
        
        let idCol = Expression<String>("id")
        let valueCol = Expression<String>("value")
        let query = systemTable.where(idCol == "currentChannelId")
        
        if let result = try db.pluck(query) {
            return try result.get(valueCol).replacingOccurrences(of: "\"", with: "")
        }

        throw DatabaseError.NoResults(query.expression.description)
    }
    
    public func serverHasChannels(_ serverUrl: String) -> Bool {
        do {
            let db = try getDatabaseForServer(serverUrl)
            let stmtString = """
            SELECT COUNT(DISTINCT my.id) FROM Channel c \
            INNER JOIN MyChannel my ON c.id=my.id AND c.delete_at = 0 \
            INNER JOIN Team t ON c.team_id=t.id
            """
            let stmt = try db.prepare(stmtString)
            let count = try stmt.scalar() as! Int64
            return count > 0
        } catch {
            return false
        }
    }
    
    public func queryChannelExists(withId channelId: String, forServerUrl serverUrl: String) -> Bool {
        if let db = try? getDatabaseForServer(serverUrl) {
            let idCol = Expression<String>("id")
            let query = channelTable.where(idCol == channelId)
            if let _ = try? db.pluck(query) {
                return true
            }
        }
        return false
    }
    
    public func hasMyChannel(_ db: Connection, channelId: String) -> Bool {
        let idCol = Expression<String>("id")
        let query = myChannelTable.where(idCol == channelId)
        if let _ = try? db.pluck(query) {
            return true
        }
        
        return false
    }
    
    public func getCurrentChannelWithTeam<T: Codable>(_ serverUrl: String) -> T? {
        do {
            let channelId = try queryCurrentChannelId(serverUrl)
            guard let currentUserId = try? queryCurrentUserId(serverUrl) else {return nil}
            let db = try getDatabaseForServer(serverUrl)
            
            let stmtString = """
            SELECT DISTINCT c.*, t.display_name AS team_display_name, \
            my.last_viewed_at, COUNT(DISTINCT cm.user_id) AS member_count, u.delete_at > 0 as deactivated \
            FROM Channel c \
            INNER JOIN MyChannel my ON c.id=my.id \
            LEFT JOIN (\
                SELECT *, ROW_NUMBER() OVER (PARTITION by user_id order by user_id ) as Ranking FROM ChannelMembership WHERE user_id != '\(currentUserId)' \
            ) cm on cm.channel_id=c.id \
            LEFT JOIN User u ON cm.user_id=u.id \
            LEFT JOIN Team t ON t.id = c.team_id \
            WHERE c.id = '\(channelId)' AND c.delete_at = 0
            GROUP BY c.id, my.last_viewed_at
            """
            
            let results: [T] = try db.prepareRowIterator(stmtString).map { try $0.decode()}
            return results.first
        } catch {
            return nil
        }
    }
    
    public func getChannelsWithTeam<T: Codable>(_ serverUrl: String) -> [T] {
        do {
            let db = try getDatabaseForServer(serverUrl)
            guard let currentUserId = try? queryCurrentUserId(serverUrl) else {return []}
            
            let stmtString = """
            SELECT DISTINCT c.*, t.display_name AS team_display_name, \
            my.last_viewed_at, COUNT(DISTINCT cm.user_id) AS member_count, u.delete_at > 0 as deactivated \
            FROM Channel c \
            INNER JOIN MyChannel my ON c.id=my.id \
            LEFT JOIN (\
                SELECT *, ROW_NUMBER() OVER (PARTITION by user_id order by user_id ) as Ranking FROM ChannelMembership WHERE user_id != '\(currentUserId)' \
            ) cm on cm.channel_id=c.id \
            LEFT JOIN User u ON cm.user_id=u.id \
            LEFT JOIN Team t ON t.id = c.team_id \
            WHERE c.delete_at = 0 \
            GROUP BY c.id, my.last_viewed_at \
            ORDER BY my.last_viewed_at DESC \
            LIMIT 20
            """
            
            let results: [T] = try db.prepareRowIterator(stmtString)
                .map { try $0.decode()}
            
            return results
        } catch {
            return []
        }
    }
    
    public func searchJoinedChannels<T: Codable>(_ serverUrl: String, term: String, matchStart: Bool = true) -> [T] {
        do {
            let db = try getDatabaseForServer(serverUrl)
            if term.starts(with: "@") {
                return []
            }
            
            var bindings: [String] = []
            var displayName: String = ""
            if matchStart {
                displayName = "c.display_name LIKE ?"
                bindings.append("\(term.lowercased())%")
            } else {
                displayName = "c.display_name LIKE ? AND c.display_name NOT LIKE ?"
                bindings.append("%\(term.lowercased())%")
                bindings.append("\(term.lowercased())%")
            }
            
            let stmtString = """
            SELECT DISTINCT c.*, t.display_name AS team_display_name, \
            my.last_viewed_at, 0 AS member_count \
            FROM Channel c \
            INNER JOIN MyChannel my ON c.id=my.id \
            INNER JOIN Team t ON t.id = c.team_id \
            WHERE c.delete_at = 0 AND \(displayName) \
            GROUP BY c.id, my.last_viewed_at \
            ORDER BY my.last_viewed_at DESC \
            LIMIT 20
            """
            
            let results: [T] = try db.prepareRowIterator(stmtString, bindings: bindings)
                .map{ try $0.decode()}
            
            return results
        } catch {
            return []
        }
    }
    
    public func searchDirectChannels<T: Codable>(_ serverUrl: String, term: String, matchStart: Bool = true) -> [T] {
        do {
            guard let currentUserId = try? queryCurrentUserId(serverUrl) else {return []}
            let db = try getDatabaseForServer(serverUrl)
            
            let onlyDMs = term.starts(with: "@") ? "AND c.type = 'D'" : ""
            var username: String = ""
            var displayName: String = ""
            let searchTerm = term.removePrefix("@").lowercased()
            var bindings: [String] = []
            if matchStart {
                username = "u.username LIKE ?"
                bindings.append("\(searchTerm)%") // binding for username
                
                displayName = "c.display_name LIKE ?"
                bindings.append("\(searchTerm)%") // binding for displayname
            } else {
                username = "u.username LIKE ? AND u.username NOT LIKE ?"
                bindings.append("%\(searchTerm)%")
                bindings.append("\(searchTerm)%")
                
                displayName = "c.display_name LIKE ? AND c.display_name NOT LIKE ?"
                bindings.append("%\(searchTerm)%")
                bindings.append("\(searchTerm)%")
            }
            
            let stmtString = """
            SELECT DISTINCT c.*, "" AS team_display_name, \
            my.last_viewed_at, COUNT(DISTINCT cm.user_id) AS member_count, u.delete_at > 0 as deactivated \
            FROM Channel c \
            INNER JOIN MyChannel my ON c.id=my.id \
            LEFT JOIN (\
                SELECT *, ROW_NUMBER() OVER (PARTITION by user_id order by user_id ) as Ranking FROM ChannelMembership WHERE user_id != '\(currentUserId)' \
            ) cm on cm.channel_id=c.id \
            LEFT JOIN User u ON u.id=cm.user_id AND (CASE WHEN c.type = 'D' THEN cm.user_id != '\(currentUserId)' ELSE 1 END)
            WHERE c.delete_at = 0 AND c.team_id = '' AND \(displayName) \(onlyDMs) \
               OR CASE WHEN c.type = 'G' THEN 0 ELSE \(username) END \
            GROUP BY c.id, my.last_viewed_at \
            ORDER BY CASE c.type WHEN 'D' THEN 0 ELSE 1 END ASC, my.last_viewed_at DESC \
            LIMIT 20
            """
            
            let results: [T] = try db.prepareRowIterator(stmtString, bindings: bindings)
                .map{ try $0.decode()}
            
            return results
        } catch {
            return []
        }
    }
    
    public func insertChannel(_ db: Connection, _ channel: Channel) throws {
        let setter = createChannelSetter(from: channel)
        try db.run(channelTable.insert(or: .replace, setter))
        let channelInfo = createChannelInfoSetter(from: channel)
        try db.run(channelInfoTable.insert(or: .replace, channelInfo))
    }
    
    public func insertOrUpdateMyChannel(_ db: Connection, _ myChannel: ChannelMember, _ isCRTEnabled: Bool, _ lastFetchedAt: Double, _ lastPostAt: Double) throws {
        let idCol = Expression<String>("id")
        let messageCountCol = Expression<Int>("message_count")
        let mentionsCol = Expression<Int>("mentions_count")
        let isUnreadCol = Expression<Bool>("is_unread")
        let lastFetchedAtCol = Expression<Double>("last_fetched_at")
        let lastPostAtCol = Expression<Double>("last_post_at")
        let mentionsCount = isCRTEnabled ? myChannel.mentionCountRoot : myChannel.mentionCount
        let messageCount = isCRTEnabled ? myChannel.internalMsgCountRoot : myChannel.internalMsgCount
        let isUnread = messageCount > 0
        
        if hasThread(db, threadId: myChannel.id) {
            let updateQuery = myChannelTable.where(idCol == myChannel.id)
                .update(
                    messageCountCol <- messageCount,
                    mentionsCol <- mentionsCount,
                    isUnreadCol <- isUnreadCol,
                    lastPostAtCol <- lastPostAt,
                    lastFetchedAtCol <- lastFetchedAt
                )
            let _ = try db.run(updateQuery)
        } else {
            let rolesCol = Expression<String>("roles")
            let manuallyUnreadCol = Expression<Bool>("manually_unread")
            let lastViewedAtCol = Expression<Double>("last_viewed_at")
            let viewedAtCol = Expression<Double>("viewed_at")
            
            let setter: [Setter] = [
                idCol <- myChannel.id,
                mentionsCol <- mentionsCount,
                messageCountCol <- messageCount,
                lastPostAtCol <- lastPostAt,
                lastViewedAtCol <- myChannel.lastViewedAt,
                viewedAtCol <- 0,
                lastFetchedAtCol <- lastFetchedAt,
                isUnreadCol <- isUnread,
                manuallyUnreadCol <- false,
                rolesCol <- myChannel.roles,
            ]
            let _ = try db.run(myChannelTable.insert(or: .replace, setter))
            try insertMyChannelSettings(db, myChannel)
            try insertChannelMember(db, myChannel)
        }
    }
    
    private func insertMyChannelSettings(_ db: Connection, _ myChannel: ChannelMember) throws {
        let id = Expression<String>("id")
        let notifyProps = Expression<String>("notify_props")
        
        let setter: [Setter] = [
            id <- myChannel.id,
            notifyProps <- myChannel.notifyProps,
        ]
        
        let _ = try db.run(myChannelSettingsTable.insert(or: .replace, setter))
    }
    
    private func insertChannelMember(_ db: Connection, _ member: ChannelMember) throws {
        let id = Expression<String>("id")
        let channelId = Expression<String>("channel_id")
        let userId = Expression<String>("user_id")
        let schemeAdmin = Expression<Bool>("scheme_admin")
        
        let setter: [Setter] = [
            id <- "\(member.id)-\(member.userId)",
            channelId <- member.id,
            userId <- member.userId,
            schemeAdmin <- member.schemeAdmin,
        ]
        
        let _ = try db.run(channelMembershipTable.insert(or: .replace, setter))
    }
    
    private func createChannelSetter(from channel: Channel) -> [Setter] {
        let id = Expression<String>("id")
        let createAt = Expression<Double>("create_at")
        let deleteAt = Expression<Double>("delete_at")
        let updateAt = Expression<Double>("update_at")
        let creatorId = Expression<String>("creator_id")
        let displayName = Expression<String>("display_name")
        let name = Expression<String>("name")
        let teamId = Expression<String>("team_id")
        let type = Expression<String>("type")
        let isGroupConstrained = Expression<Bool>("group_constrained")
        let shared = Expression<Bool>("shared")
        
        var setter = [Setter]()
        setter.append(id <- channel.id)
        setter.append(createAt <- channel.createAt)
        setter.append(deleteAt <- channel.deleteAt)
        setter.append(updateAt <- channel.updateAt)
        setter.append(creatorId <- channel.creatorId)
        setter.append(displayName <- channel.displayName)
        setter.append(name <- channel.name)
        setter.append(teamId <- channel.teamId)
        setter.append(type <- channel.type)
        setter.append(isGroupConstrained <- channel.groupConstrained)
        setter.append(shared <- channel.shared)

        return setter
    }
    
    private func createChannelInfoSetter(from channel: Channel) -> [Setter] {
        let id = Expression<String>("id")
        let header = Expression<String>("header")
        let purpose = Expression<String>("purpose")
        let guestCount = Expression<Int>("guest_count")
        let memberCount = Expression<Int>("member_count")
        let pinnedPostCount = Expression<Int>("pinned_post_count")
        
        var setter = [Setter]()
        setter.append(id <- channel.id)
        setter.append(header <- channel.header)
        setter.append(purpose <- channel.purpose)
        setter.append(guestCount <- 0)
        setter.append(memberCount <- 0)
        setter.append(pinnedPostCount <- 0)
        return setter
    }
}
