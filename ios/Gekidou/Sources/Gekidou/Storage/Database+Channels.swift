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
        
        throw DatabaseError.NoResults(query.asSQL())
    }
    
    public func serverHasChannels(_ serverUrl: String) -> Bool {
        do {
            let db = try getDatabaseForServer(serverUrl)
            let stmtString = """
            SELECT COUNT(DISTINCT my.id) FROM Channel c \
            INNER JOIN MyChannel my ON c.id=my.id \
            INNER JOIN Team t ON c.team_id=t.id
            """
            let stmt = try db.prepare(stmtString)
            let count = try stmt.scalar() as! Int64
            return count > 0
        } catch {
            return false
        }
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
            
            let stmt = try db.prepare(stmtString)
            let results: [T] = try stmt.prepareRowIterator().map { try $0.decode()}
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
            
            let stmt = try db.prepare(stmtString)
            let results: [T] = try stmt.prepareRowIterator()
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
            
            let stmt = try db.prepare(stmtString, bindings)
            let results: [T] = try stmt.prepareRowIterator()
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
            var searchTerm = term.removePrefix("@").lowercased()
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
            
            let stmt = try db.prepare(stmtString, bindings)
            let results: [T] = try stmt.prepareRowIterator()
                .map{ try $0.decode()}
            
            return results
        } catch {
            return []
        }
    }
}
