//
//  Network+Channels.swift
//  
//
//  Created by Miguel Alatzar on 8/27/21.
//

import Foundation

extension Network {
    public func fetchNeededUsers(userIds: Set<String>, usernames: Set<String>, forServerUrl serverUrl: String) -> [User]? {
        let group = DispatchGroup()
        var users: [User]? = nil
        if !userIds.isEmpty || !usernames.isEmpty {
            // remove existing users in the database
            users = [User]()
            let storedUserIds = Database.default.queryUsers(byIds: userIds, forServerUrl: serverUrl)
            if !(userIds.subtracting(storedUserIds)).isEmpty {
                group.enter()
                DispatchQueue.global(qos: .default).async {
                    self.fetchUsers(byIds: Array(userIds), forServerUrl: serverUrl) {data, response, error in
                        if let data = data,
                           let profiles = try? JSONDecoder().decode([User].self, from: data) {
                            users?.append(contentsOf: profiles)
                        }
                        group.leave()
                    }
                }
            }
            
            let storedUsernames = Database.default.queryUsers(byUsernames: usernames, forServerUrl: serverUrl)
            if !(usernames.subtracting(storedUsernames)).isEmpty {
                group.enter()
                DispatchQueue.global(qos: .default).async {
                    self.fetchUsers(byUsernames: Array(usernames), forServerUrl: serverUrl) {data, response, error in
                        if let data = data,
                           let profiles = try? JSONDecoder().decode([User].self, from: data) {
                            users?.append(contentsOf: profiles)
                        }
                        group.leave()
                    }
                }
            }
        }
        
        group.wait()
        return users
    }

    public func fetchUsers(byIds userIds: [String], forServerUrl serverUrl: String, completionHandler: @escaping ResponseHandler) {
        let endpoint = "/users/ids"
        let url = buildApiUrl(serverUrl, endpoint)
        let data = try? JSONSerialization.data(withJSONObject: userIds, options: [])
        
        return request(url, withMethod: "POST", withBody: data, andHeaders: nil, forServerUrl: serverUrl, completionHandler: completionHandler)
    }
    
    public func fetchUsers(byUsernames usernames: [String], forServerUrl serverUrl: String, completionHandler: @escaping ResponseHandler) {
        let endpoint = "/users/usernames"
        let url = buildApiUrl(serverUrl, endpoint)
        let data = try? JSONSerialization.data(withJSONObject: usernames, options: [])
        
        return request(url, withMethod: "POST", withBody: data, andHeaders: nil, forServerUrl: serverUrl, completionHandler: completionHandler)
    }
    
    public func fetchProfiles(inChannelId channelId: String, forServerUrl serverUrl: String, completionHandler: @escaping ResponseHandler) {
        let endpoint = "/users?in_channel=\(channelId)&page=0&per_page=8&sort="
        let url = buildApiUrl(serverUrl, endpoint)
        request(url, usingMethod: "GET", forServerUrl: serverUrl, completionHandler: completionHandler)
    }
    
    public func fetchUserProfilePicture(userId: String, lastUpdateAt: Double, forServerUrl serverUrl: String, completionHandler: @escaping ResponseHandler) {
        let endpoint = "/users/\(userId)/image?lastPictureUpdate=\(Int64(lastUpdateAt))"
        let url = buildApiUrl(serverUrl, endpoint)
        
        return request(url, usingMethod: "GET", forServerUrl: serverUrl, completionHandler: completionHandler)
    }
}
