//
//  Database+System.swift
//  Gekidou
//  
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import Foundation
import SQLite

extension Database {
    public func getConfig(_ serverUrl: String, _ key: String) -> String? {
        do {
            let db = try getDatabaseForServer(serverUrl)
            let id = Expression<String>("id")
            let value = Expression<String>("value")
            let query = configTable.select(value).filter(id == key)
            if let result = try db.pluck(query) {
                let val = try result.get(value)
                return val
            }
            
            return nil
        } catch {
            return nil
        }
    }
}
