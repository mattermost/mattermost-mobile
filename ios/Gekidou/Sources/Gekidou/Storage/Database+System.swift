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
    public func getConfig(_ serverUrl: String) -> [String: Any]? {
        do {
            let db = try getDatabaseForServer(serverUrl)
            let id = Expression<String>("id")
            let value = Expression<String>("value")
            let query = systemTable.select(value).filter(id == "config")
            var json: [String: Any]? = nil
            if let result = try db.pluck(query) {
                let val = try result.get(value)
                json = try? JSONSerialization.jsonObject(with: val.data(using: .utf8)!, options: []) as? [String: Any]
            }
            
            return json
        } catch {
            return nil
        }
    }
}
