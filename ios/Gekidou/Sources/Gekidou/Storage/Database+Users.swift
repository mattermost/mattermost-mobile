//
//  Database+Users.swift
//  Gekidou
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import Foundation
import SQLite

public struct User: Codable, Hashable {
    let id: String
    let auth_service: String
    let update_at: Int64
    let delete_at: Int64
    let email: String
    let first_name: String
    let is_bot: Bool
    let is_guest: Bool
    let last_name: String
    let last_picture_update: Int64
    let locale: String
    let nickname: String
    let position: String
    let roles: String
    let status: String
    let username: String
    let notify_props: String
    let props: String
    let timezone: String
    
    public enum UserKeys: String, CodingKey {
        case id = "id"
        case auth_service = "auth_service"
        case update_at = "update_at"
        case delete_at = "delete_at"
        case email = "email"
        case first_name = "first_name"
        case is_bot = "is_bot"
        case last_name = "last_name"
        case last_picture_update = "last_picture_update"
        case locale = "locale"
        case nickname = "nickname"
        case position = "position"
        case roles = "roles"
        case username = "username"
        case notify_props = "notify_props"
        case props = "props"
        case timezone = "timezone"
    }
    
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: UserKeys.self)
        id = try container.decode(String.self, forKey: .id)
        auth_service = try container.decode(String.self, forKey: .auth_service)
        update_at = try container.decode(Int64.self, forKey: .update_at)
        delete_at = try container.decode(Int64.self, forKey: .delete_at)
        email = try container.decode(String.self, forKey: .email)
        first_name = try container.decode(String.self, forKey: .first_name)
        is_bot = container.contains(.is_bot) ? try container.decode(Bool.self, forKey: .is_bot) : false
        roles = try container.decode(String.self, forKey: .roles)
        is_guest = roles.contains("system_guest")
        last_name = try container.decode(String.self, forKey: .last_name)
        last_picture_update = try container.decodeIfPresent(Int64.self, forKey: .last_picture_update) ?? 0
        locale = try container.decode(String.self, forKey: .locale)
        nickname = try container.decode(String.self, forKey: .nickname)
        position = try container.decode(String.self, forKey: .position)
        status = "offline"
        username = try container.decode(String.self, forKey: .username)

        let notifyPropsData = try container.decodeIfPresent([String: String].self, forKey: .notify_props)
        if (notifyPropsData != nil) {
            notify_props = Database.default.json(from: notifyPropsData) ?? "{}"
        } else {
            notify_props = "{}"
        }

        let propsData = try container.decodeIfPresent([String: String].self, forKey: .props)
        if (propsData != nil) {
            props = Database.default.json(from: propsData) ?? "{}"
        } else {
            props = "{}"
        }
        
        let timezoneData = try container.decodeIfPresent([String: String].self, forKey: .timezone)
        if (timezoneData != nil) {
            timezone = Database.default.json(from: timezoneData) ?? "{}"
        } else {
            timezone = "{}"
        }
    }
}

extension Database {
    public func queryCurrentUserId(_ serverUrl: String) throws -> String {
        let db = try getDatabaseForServer(serverUrl)
        
        let idCol = Expression<String>("id")
        let valueCol = Expression<String>("value")
        let query = systemTable.where(idCol == "currentUserId")
        
        if let result = try db.pluck(query) {
            return try result.get(valueCol).replacingOccurrences(of: "\"", with: "")
        }
        
        throw DatabaseError.NoResults(query.asSQL())
    }
    
    public func queryCurrentUser(_ serverUrl: String) throws -> Row? {
        let currentUserId = try queryCurrentUserId(serverUrl)
        let idCol = Expression<String>("id")
        let query = userTable.where(idCol == currentUserId)
        let db = try getDatabaseForServer(serverUrl)

        if let result = try db.pluck(query) {
            return result
        }
        
        throw DatabaseError.NoResults(query.asSQL())
    }

    public func queryUsers(byIds: Set<String>, withServerUrl: String) throws -> Set<String> {
        let db = try getDatabaseForServer(withServerUrl)

        var result: Set<String> = Set()
        let idCol = Expression<String>("id")
        for user in try db.prepare(
            userTable.select(idCol).filter(byIds.contains(idCol))
        ) {
            result.insert(user[idCol])
        }
        
        return result
    }
    
    public func queryUsers(byUsernames: Set<String>, withServerUrl: String) throws -> Set<String> {
        let db = try getDatabaseForServer(withServerUrl)
        
        var result: Set<String> = Set()
        let usernameCol = Expression<String>("username")
        for user in try db.prepare(
            userTable.select(usernameCol).filter(byUsernames.contains(usernameCol))
        ) {
            result.insert(user[usernameCol])
        }
        
        return result
    }
    
    public func insertUsers(_ db: Connection, _ users: Set<User>) throws {
        let setters = createUserSettedrs(from: users)
        let insertQuery = userTable.insertMany(or: .replace, setters)
        try db.run(insertQuery)
    }
    
    private func createUserSettedrs(from users: Set<User>) -> [[Setter]] {
        let id = Expression<String>("id")
        let authService = Expression<String>("auth_service")
        let updateAt = Expression<Int64>("update_at")
        let deleteAt = Expression<Int64>("delete_at")
        let email = Expression<String>("email")
        let firstName = Expression<String>("first_name")
        let isBot = Expression<Bool>("is_bot")
        let isGuest = Expression<Bool>("is_guest")
        let lastName = Expression<String>("last_name")
        let lastPictureUpdate = Expression<Int64>("last_picture_update")
        let locale = Expression<String>("locale")
        let nickname = Expression<String>("nickname")
        let position = Expression<String>("position")
        let roles = Expression<String>("roles")
        let status = Expression<String>("status")
        let username = Expression<String>("username")
        let notifyProps = Expression<String>("notify_props")
        let props = Expression<String>("props")
        let timezone = Expression<String>("timezone")
        
        var setters = [[Setter]]()
        for user in users {
            var setter = [Setter]()
            setter.append(id <- user.id)
            setter.append(authService <- user.auth_service)
            setter.append(updateAt <- user.update_at)
            setter.append(deleteAt <- user.delete_at)
            setter.append(email <- user.email)
            setter.append(firstName <- user.first_name)
            setter.append(isBot <- user.is_bot)
            setter.append(isGuest <- user.is_guest)
            setter.append(lastName <- user.last_name)
            setter.append(lastPictureUpdate <- user.last_picture_update)
            setter.append(locale <- user.locale)
            setter.append(nickname <- user.nickname)
            setter.append(position <- user.position)
            setter.append(roles <- user.roles)
            setter.append(status <- user.status)
            setter.append(username <- user.username)
            setter.append(notifyProps <- user.notify_props)
            setter.append(props <- user.props)
            setter.append(timezone <- user.timezone)
            setters.append(setter)
        }
        
        return setters
    }
}
