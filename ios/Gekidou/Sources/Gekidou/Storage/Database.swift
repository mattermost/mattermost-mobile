//
//  Database.swift
//  Gekidou
//
//  Created by Miguel Alatzar on 8/20/21.
//

import Foundation
import SQLite3
import SQLite

typealias Expression = SQLite.Expression

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
    internal var globalTable = Table("Global")
    internal var systemTable = Table("System")
    internal var teamTable = Table("Team")
    internal var myTeamTable = Table("MyTeam")
    internal var teamMembershipTable = Table("TeamMembership")
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
    internal var userTable = Table("User")
    internal var threadTable = Table("Thread")
    internal var threadParticipantTable = Table("ThreadParticipant")
    internal var threadsInTeamTable = Table("ThreadsInTeam")
    internal var teamThreadsSyncTable = Table("TeamThreadsSync")
    internal var configTable = Table("Config")
    internal var preferenceTable = Table("Preference")
    internal var categoryTable = Table("Category")
    internal var categoryChannelTable = Table("CategoryChannel")
    
    @objc public static let `default` = Database()
    
    override private init() {
        guard let appGroupId = Bundle.main.object(forInfoDictionaryKey: "AppGroupIdentifier") as? String else {
            GekidouLogger.shared.log(.error, "Gekidou Database: AppGroupIdentifier missing from Info.plist - database operations will fail")
            DEFAULT_DB_PATH = ""
            super.init()
            return
        }

        guard let sharedDirectory = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupId) else {
            GekidouLogger.shared.log(.error, "Gekidou Database: Failed to get shared container for app group %{public}@ - database operations will fail", appGroupId)
            DEFAULT_DB_PATH = ""
            super.init()
            return
        }

        let databaseUrl = sharedDirectory.appendingPathComponent("databases/\(DEFAULT_DB_NAME)")
        DEFAULT_DB_PATH = databaseUrl.path
        super.init()
    }
    
    @objc public func getOnlyServerUrlObjc() -> String {
        do {
            return try getOnlyServerUrl()
        } catch {
            print(error)
            return ""
        }
    }
    
    public func generateId() -> String {
        return UUID().uuidString.lowercased()
    }
    
    public func getOnlyServerUrl() throws -> String {
        do {
            let db = try Connection(DEFAULT_DB_PATH)
            let url = Expression<String>("url")
            let identifier = Expression<String>("identifier")
            let lastActiveAt = Expression<Int64>("last_active_at")
            let query = serversTable.select(url).filter(lastActiveAt > 0 && identifier != "")

            var serverUrl: String?
            for result in try db.prepare(query) {
                if (serverUrl != nil) {
                    throw DatabaseError.MultipleServers
                }

                serverUrl = try result.get(url)
            }

            if let serverUrl = serverUrl {
                return serverUrl
            }

            throw DatabaseError.NoResults(query.expression.description)
        } catch {
            GekidouLogger.shared.log(.error, "Gekidou Database: Failed to get only server URL from %{public}@ - %{public}@", DEFAULT_DB_PATH, String(describing: error))
            throw error
        }
    }

    public func getServerUrlForServer(_ id: String) throws -> String {
        do {
            let db = try Connection(DEFAULT_DB_PATH)
            let url = Expression<String>("url")
            let identifier = Expression<String>("identifier")
            let query = serversTable.select(url).filter(identifier == id)

            if let server = try db.pluck(query),
               let serverUrl = try? server.get(url) {
                return serverUrl
            }

            throw DatabaseError.NoResults(query.expression.description)
        } catch {
            GekidouLogger.shared.log(.error, "Gekidou Database: Failed to get server URL for server %{public}@ from %{public}@ - %{public}@", id, DEFAULT_DB_PATH, String(describing: error))
            throw error
        }
    }
    
    public func getAllActiveDatabases<T: Codable>() -> [T] {
        guard let db = try? Connection(DEFAULT_DB_PATH) else {return []}
        let lastActiveAt = Expression<Int64>("last_active_at")
        let identifier = Expression<String>("identifier")
        let query = serversTable.filter(lastActiveAt > 0 && identifier != "").order(lastActiveAt.desc)
        do {
            let rows = try db.prepare(query)
            let servers: [T] = try rows.map { row in
                return try row.decode()
            }

            return servers
        } catch {
            return []
        }
    }
    
    public func getAllActiveServerUrls() -> [String] {
        guard let db = try? Connection(DEFAULT_DB_PATH) else {return []}
        let lastActiveAt = Expression<Int64>("last_active_at")
        let identifier = Expression<String>("identifier")
        let url = Expression<String>("url")
        let query = serversTable.filter(lastActiveAt > 0 && identifier != "").order(lastActiveAt.desc)
        do {
            let rows = try db.prepare(query)
            let servers: [String] = try rows.map { row in
                return try row.get(url)
            }

            return servers
        } catch {
            return []
        }
    }
    
    public func getCurrentServerDatabase<T: Codable>() -> T? {
        guard let db = try? Connection(DEFAULT_DB_PATH) else {return nil}
        do {
            let lastActiveAt = Expression<Int64>("last_active_at")
            let identifier = Expression<String>("identifier")
            let query = serversTable.filter(lastActiveAt > 0 && identifier != "").order(lastActiveAt.desc)
            
            if let result = try db.pluck(query) {
                let server: T = try result.decode()
                return server
            }
            
            return nil
        } catch {
            return nil
        }
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
        
        throw DatabaseError.NoResults(query.expression.description)
    }
    
    internal func json(from object:Any?) -> String? {
        guard let object = object, let data = try? JSONSerialization.data(withJSONObject: object, options: []) else {
            return nil
        }
        return String(data: data, encoding: String.Encoding.utf8)
    }
}
