//
//  DatabaseHelper.swift
//  DatabaseHelper
//
//  Created by Miguel Alatzar on 6/14/21.
//

import Foundation
import SQLite3

enum DatabaseError: Error {
    case OpenFailure(_ dbPath: String)
    case MultipleServers
    case NoResults(_ query: String)
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
        }
    }
}

public class DatabaseHelper: NSObject {
    internal let DEFAULT_DB_NAME = "app.db"
    internal var DEFAULT_DB_PATH: String
    internal var defaultDB: OpaquePointer? = nil
    
    @objc public static let `default` = DatabaseHelper()
    
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
}
