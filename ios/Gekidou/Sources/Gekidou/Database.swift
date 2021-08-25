//
//  Database.swift
//  Gekidou
//
//  Created by Miguel Alatzar on 8/20/21.
//

import Foundation
import SQLite3

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
        if sqlite3_open(DEFAULT_DB_PATH, &defaultDB) != SQLITE_OK {
            throw DatabaseError.OpenFailure(DEFAULT_DB_PATH)
        }
        
        defer {
            sqlite3_finalize(queryStatement)
            sqlite3_close(defaultDB)
        }
                
        var queryStatement: OpaquePointer?
        let queryString = "SELECT url FROM Servers;"
        if sqlite3_prepare_v2(defaultDB, queryString, -1, &queryStatement, nil) == SQLITE_OK {
            if sqlite3_step(queryStatement) == SQLITE_ROW,
               let result = sqlite3_column_text(queryStatement, 0) {
                return String(cString: result)
            }
            
            if sqlite3_step(queryStatement) == SQLITE_ROW {
                // Throw since we have more than one row in the `servers` table
                throw DatabaseError.MultipleServers
            }
        }
        
        throw DatabaseError.NoResults(queryString)
    }
    
    public func queryPostsSinceAndCountForChannel(withId channelId: String, withServerUrl serverUrl: String) throws -> (since: Int64, count: Int32) {
        let databasePath: String?
        do {
            databasePath = try getDatabasePathForServer(serverUrl)
        } catch DatabaseError.NoResults {
            throw DatabaseError.NoDatabase(serverUrl)
        } catch {
            throw error
        }
        
        var serverDB: OpaquePointer? = nil
        if sqlite3_open(databasePath!, &serverDB) != SQLITE_OK {
            throw DatabaseError.OpenFailure(databasePath!)
        }
        
        defer {
            sqlite3_finalize(queryStatement)
            sqlite3_close(serverDB)
        }
        
        var queryStatement: OpaquePointer?
        let postsInChannelQuery = "SELECT earliest, latest FROM PostsInChannel WHERE channel_id=\"\(channelId)\" ORDER BY latest DESC;"
        var earliest: Int64?;
        var latest: Int64?;
        if sqlite3_prepare_v2(serverDB, postsInChannelQuery, -1, &queryStatement, nil) == SQLITE_OK, sqlite3_step(queryStatement) == SQLITE_ROW {
            earliest = sqlite3_column_int64(queryStatement, 0)
            latest = sqlite3_column_int64(queryStatement, 1)
        }
        
        var since: Int64 = 0
        var count: Int32 = 0
        if let earliest = earliest, let latest = latest {
            let postsQuery = "SELECT create_at, count(*) FROM Post WHERE channel_id=\"\(channelId)\" AND delete_at=0 AND create_at BETWEEN \(earliest) AND \(latest) ORDER BY create_at DESC LIMIT 1;"
            if sqlite3_prepare_v2(serverDB, postsQuery, -1, &queryStatement, nil) == SQLITE_OK, sqlite3_step(queryStatement) == SQLITE_ROW {
                since = sqlite3_column_int64(queryStatement, 0)
                count = sqlite3_column_int(queryStatement, 1)
            }
        }
        
        return (since, count)
    }
    
    public func insertChannelPostsResponse(_ serverUrl: String, _ channelId: String, _ response: Data) throws {
        let databasePath: String?
        do {
            databasePath = try getDatabasePathForServer(serverUrl)
        } catch DatabaseError.NoResults {
            throw DatabaseError.NoDatabase(serverUrl)
        } catch {
            throw error
        }
        
        var serverDB: OpaquePointer? = nil
        if sqlite3_open(databasePath!, &serverDB) != SQLITE_OK {
            throw DatabaseError.OpenFailure(databasePath!)
        }
        
        defer {
            sqlite3_finalize(insertStatement)
            sqlite3_close(serverDB)
        }
        
        var insertStatement: OpaquePointer?
        let insertStatementStr = "INSERT INTO ChannelPostsResponse (channel_id, response) VALUES (?, ?);"
        if sqlite3_prepare_v2(serverDB, insertStatementStr, -1, &insertStatement, nil) == SQLITE_OK {
            sqlite3_bind_text(insertStatement, 1, channelId.cString(using: String.Encoding.utf8), -1, nil)
            sqlite3_bind_text(insertStatement, 2, String(data: response, encoding: String.Encoding.utf8), -1, nil)
            if sqlite3_step(insertStatement) != SQLITE_DONE {
                throw DatabaseError.InsertError(insertStatementStr)
            }
        }
    }
    
    private func getDatabasePathForServer(_ serverUrl: String) throws -> String? {
        if sqlite3_open(DEFAULT_DB_PATH, &defaultDB) != SQLITE_OK {
            throw DatabaseError.OpenFailure(DEFAULT_DB_PATH)
        }
        
        defer {
            sqlite3_finalize(queryStatement)
            sqlite3_close(defaultDB)
        }
                
        var queryStatement: OpaquePointer?
        let queryString = "SELECT db_path FROM Servers WHERE url=\"\(serverUrl)\";"
        if sqlite3_prepare_v2(defaultDB, queryString, -1, &queryStatement, nil) == SQLITE_OK {
            if sqlite3_step(queryStatement) == SQLITE_ROW,
               let result = sqlite3_column_text(queryStatement, 0) {
                return String(cString: result)
            }
        }
        
        throw DatabaseError.NoResults(queryString)
    }
}
