//
//  Database.swift
//  Gekidou
//
//  Created by Miguel Alatzar on 8/20/21.
//

import Foundation
import SQLite3
import SQLite

// TODO: This should be exposed to Objective-C in order to handle
// any Database throwable methods.
enum DatabaseError: Error {
    case OpenFailure(_ dbPath: String)
    case MultipleServers
    case NoResults(_ query: String)
    case NoDatabase(_ serverUrl: String)
    case InsertError(_ statement: String)
}

extension DatabaseError: LocalizedError {
    var errorDescription: String? {
        switch self {
        case .OpenFailure(dbPath: let dbPath):
            return "Error opening database: \(dbPath)"
        case .MultipleServers:
            return "Cannot determine server URL as there are multiple servers"
        case .NoResults(query: let query):
            return "No results for query: \(query)"
        case .NoDatabase(serverUrl: let serverUrl):
            return "No database for server: \(serverUrl)"
        case .InsertError(statement: let statement):
            return "Insert error: \(statement)"
        }
    }
}

public class Database: NSObject {
    internal let DEFAULT_DB_NAME = "app.db"
    internal var DEFAULT_DB_PATH: String
    internal var defaultDB: OpaquePointer? = nil
    
    internal var serversTable = Table("Servers")
    internal var systemTable = Table("System")
    internal var teamTable = Table("Team")
    internal var myTeamTable = Table("MyTeam")
    internal var channelTable = Table("Channel")
    internal var channelInfoTable = Table("ChannelInfo")
    internal var channelMembershipTable = Table("ChannelMembership")
    internal var myChannelTable = Table("MyChannel")
    internal var myChannelSettingsTable = Table("MyChannelSettings")
    internal var postTable = Table("Post")
    internal var postsInChannelTable = Table("PostsInChannel")
    internal var postsInThreadTable = Table("PostsInThread")
    internal var postMetadataTable = Table("PostMetadata")
    internal var reactionTable = Table("Reaction")
    internal var fileTable = Table("File")
    internal var emojiTable = Table("CustomEmoji")
    
    @objc public static let `default` = Database()
    
    override private init() {
        let appGroupId = Bundle.main.object(forInfoDictionaryKey: "AppGroupIdentifier") as! String
        let sharedDirectory = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupId)!
        let databaseUrl = sharedDirectory.appendingPathComponent("databases/\(DEFAULT_DB_NAME)")
        
        DEFAULT_DB_PATH = databaseUrl.path
    }
    
    @objc public func getOnlyServerUrlObjc() -> String {
        do {
            return try getOnlyServerUrl()
        } catch {
            print(error)
            return ""
        }
    }
    
    public func getOnlyServerUrl() throws -> String {
        let db = try Connection(DEFAULT_DB_PATH)
        let url = Expression<String>("url")
        let query = serversTable.select(url)
        
        var serverUrl: String?
        for result in try db.prepare(query) {
            if (serverUrl != nil) {
                throw DatabaseError.MultipleServers
            }
            
            serverUrl = try result.get(url)
        }
        
        if (serverUrl != nil) {
            return serverUrl!
        }
    
        throw DatabaseError.NoResults(query.asSQL())
    }
    
    internal func getDatabaseForServer(_ serverUrl: String) throws -> Connection {
        let db = try Connection(DEFAULT_DB_PATH)
        let url = Expression<String>("url")
        let dbPath = Expression<String>("db_path")
        let query = serversTable.select(dbPath).where(url == serverUrl)
        
        if let result = try db.pluck(query) {
            let path = try result.get(dbPath)
            return try Connection(path)
        }
        
        throw DatabaseError.NoResults(query.asSQL())
    }
    
    internal func queryCurrentUserId(_ serverUrl: String) throws -> String {
        let db = try getDatabaseForServer(serverUrl)
        
        let idCol = Expression<String>("id")
        let valueCol = Expression<String>("value")
        let query = systemTable.where(idCol == "currentUserId")
        
        if let result = try db.pluck(query) {
            return try result.get(valueCol).replacingOccurrences(of: "\"", with: "")
        }
        
        throw DatabaseError.NoResults(query.asSQL())
    }
    
    private func json(from object:Any?) -> String? {
        guard let object = object, let data = try? JSONSerialization.data(withJSONObject: object, options: []) else {
            return nil
        }
        return String(data: data, encoding: String.Encoding.utf8)
    }
}
