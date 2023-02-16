//
//  Database+Users.swift
//  Gekidou
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import Foundation
import SQLite

extension Database {
    public func getUserFromRow(_ row: Row) -> User? {
        do {
            let decoder = row.decoder()
            let _ = try decoder.container(keyedBy: User.UserKeys.self)
            return try User(from: decoder)
        } catch {
            print(error.localizedDescription)
        }
        
        return nil
    }

    public func queryCurrentUserId(_ serverUrl: String) throws -> String {
        let db = try getDatabaseForServer(serverUrl)
        
        let idCol = Expression<String>("id")
        let valueCol = Expression<String>("value")
        let query = systemTable.where(idCol == "currentUserId")
        
        if let result = try db.pluck(query) {
            return try result.get(valueCol).replacingOccurrences(of: "\"", with: "")
        }
        
        throw DatabaseError.NoResults(query.expression.description)
    }
    
    public func queryCurrentUser(_ serverUrl: String) throws -> Row? {
        let currentUserId = try queryCurrentUserId(serverUrl)
        let idCol = Expression<String>("id")
        let query = userTable.where(idCol == currentUserId)
        let db = try getDatabaseForServer(serverUrl)

        if let result = try db.pluck(query) {
            return result
        }
        
        throw DatabaseError.NoResults(query.expression.description)
    }
    
    public func getCurrentUserLocale(_ serverUrl: String) -> String {
        if let user = try? queryCurrentUser(serverUrl) {
            if let locale = try? user.get(Expression<String>("locale")) {
                return locale
            }
        }
        
        return "en"
    }
    
    public func getUserLastPictureAt(for userId: String,  forServerUrl serverUrl: String) -> Double? {
        var updateAt: Double?
        do {
            let db = try getDatabaseForServer(serverUrl)
            
            let stmtString = "SELECT * FROM User WHERE id='\(userId)'"
            
            let results: [User] = try db.prepareRowIterator(stmtString).map {try $0.decode()}
            updateAt = results.first?.lastPictureUpdate

        } catch {
            return nil
        }

        return updateAt
    }

    public func queryUsers(byIds userIds: Set<String>, forServerUrl serverUrl: String) -> Set<String> {
        var result: Set<String> = Set()
        if let db = try? getDatabaseForServer(serverUrl) {
            
            let idCol = Expression<String>("id")
            if let users = try? db.prepare(
                userTable.select(idCol).filter(userIds.contains(idCol))
            ) {
                for user in users {
                    result.insert(user[idCol])
                }
            }
        }
        
        return result
    }
    
    public func queryUsers(byUsernames usernames: Set<String>, forServerUrl serverUrl: String) -> Set<String> {
        var result: Set<String> = Set()
        if let db = try? getDatabaseForServer(serverUrl) {
            let usernameCol = Expression<String>("username")
            if let users = try? db.prepare(
                userTable.select(usernameCol).filter(usernames.contains(usernameCol))
            ) {
                for user in users {
                    result.insert(user[usernameCol])
                }
            }
        }
        
        return result
    }
    
    public func insertUsers(_ db: Connection, _ users: [User]) throws {
        let setters = createUserSetters(from: users)
        let insertQuery = userTable.insertMany(or: .replace, setters)
        try db.run(insertQuery)
    }
    
    private func createUserSetters(from users: [User]) -> [[Setter]] {
        let id = Expression<String>("id")
        let authService = Expression<String>("auth_service")
        let updateAt = Expression<Double>("update_at")
        let deleteAt = Expression<Double>("delete_at")
        let email = Expression<String>("email")
        let firstName = Expression<String>("first_name")
        let isBot = Expression<Bool>("is_bot")
        let isGuest = Expression<Bool>("is_guest")
        let lastName = Expression<String>("last_name")
        let lastPictureUpdate = Expression<Double>("last_picture_update")
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
            setter.append(authService <- user.authService)
            setter.append(updateAt <- user.updateAt)
            setter.append(deleteAt <- user.deleteAt)
            setter.append(email <- user.email)
            setter.append(firstName <- user.firstName)
            setter.append(isBot <- user.isBot)
            setter.append(isGuest <- user.isGuest)
            setter.append(lastName <- user.lastName)
            setter.append(lastPictureUpdate <- user.lastPictureUpdate)
            setter.append(locale <- user.locale)
            setter.append(nickname <- user.nickname)
            setter.append(position <- user.position)
            setter.append(roles <- user.roles)
            setter.append(status <- user.status)
            setter.append(username <- user.username)
            setter.append(notifyProps <- user.notifyProps)
            setter.append(props <- user.props)
            setter.append(timezone <- user.timezone)
            setters.append(setter)
        }
        
        return setters
    }
}
