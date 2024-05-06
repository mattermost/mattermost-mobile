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
    public func getDeviceToken() -> String? {
        if let db = try? Connection(DEFAULT_DB_PATH) {
            let idCol = Expression<String>("id")
            let valueCol = Expression<String>("value")
            let query = globalTable.select(valueCol).filter(idCol == "deviceToken")
            if let result = try? db.pluck(query) {
                return try? result.get(valueCol)
            }
        }
        
        return nil
    }

    public func getConfig(_ serverUrl: String, _ key: String) -> String? {
        if let db = try? getDatabaseForServer(serverUrl) {
            let id = Expression<String>("id")
            let value = Expression<String>("value")
            let query = configTable.select(value).filter(id == key)
            if let result = try? db.pluck(query) {
                return try? result.get(value)
            }
        }
        return nil
    }
    
    public func getLicense(_ serverUrl: String) -> String? {
        if let db = try? getDatabaseForServer(serverUrl) {
            let id = Expression<String>("id")
            let value = Expression<String>("value")
            let query = systemTable.select(value).filter(id == "license")
            if let result = try? db.pluck(query) {
                return try? result.get(value)
            }
        }
        return nil
    }
    
    public func geConfigDisplayNameSetting(_ serverUrl: String) -> String? {
        let licenseValue = getLicense(serverUrl)
        guard let licenseData = licenseValue?.data(using: .utf8),
              let license = try? JSONSerialization.jsonObject(with: licenseData) as? Dictionary<String,String>,
              let lockDisplayName = getConfig(serverUrl, "LockTeammateNameDisplay")
        else { return nil }
        
        let displayName = getConfig(serverUrl, "TeammateNameDisplay") ?? "full_name"
        let licenseLock = license["LockTeammateNameDisplay"] ?? "false"
        if licenseLock == "true" && lockDisplayName == "true" {
            return displayName
        }
        return nil
    }
}
