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
        if let db = try? openConnection(DEFAULT_DB_PATH) {
            let idCol = Expression<String>("id")
            let valueCol = Expression<String>("value")
            let query = globalTable.select(valueCol).filter(idCol == "deviceToken")
            if let result = try? db.pluck(query) {
                return try? result.get(valueCol)
            }
        }

        return nil
    }

    public func getVoIPDeviceToken() -> String? {
        if let db = try? openConnection(DEFAULT_DB_PATH) {
            let idCol = Expression<String>("id")
            let valueCol = Expression<String>("value")
            let query = globalTable.select(valueCol).filter(idCol == "voipDeviceToken")
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
    
    /// The session's direct and group message decisions, stored by the app as JSON. A missing or
    /// unparseable row allows everything, and a field is denied only when it is stored as false.
    public func getDmGmAccess(_ serverUrl: String) -> (start: Bool, read: Bool, write: Bool) {
        var value: String?
        if let db = try? getDatabaseForServer(serverUrl) {
            let id = Expression<String>("id")
            let valueCol = Expression<String>("value")
            let query = systemTable.select(valueCol).filter(id == "dmGmAccess")
            if let result = try? db.pluck(query) {
                value = try? result.get(valueCol)
            }
        }

        guard let data = value?.data(using: .utf8),
              let access = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else { return (true, true, true) }

        let isDenied = { (key: String) in (access[key] as? Bool) == false }
        return (!isDenied("start"), !isDenied("read"), !isDenied("write"))
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
