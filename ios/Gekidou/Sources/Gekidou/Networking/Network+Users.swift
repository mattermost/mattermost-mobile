//
//  Network+Channels.swift
//  
//
//  Created by Miguel Alatzar on 8/27/21.
//

import Foundation

extension Network {
    public func fetchUsers(byIds userIds: [String], withServerUrl serverUrl: String, completionHandler: @escaping ResponseHandler) {
        let endpoint = "/users/ids"
        let url = buildApiUrl(serverUrl, endpoint)
        let data = try? JSONSerialization.data(withJSONObject: userIds, options: [])
        
        return request(url, withMethod: "POST", withBody: data, withHeaders: nil, withServerUrl: serverUrl, completionHandler: completionHandler)
    }
    
    public func fetchUsers(byUsernames usernames: [String], withServerUrl serverUrl: String, completionHandler: @escaping ResponseHandler) {
        let endpoint = "/users/usernames"
        let url = buildApiUrl(serverUrl, endpoint)
        let data = try? JSONSerialization.data(withJSONObject: usernames, options: [])
        
        return request(url, withMethod: "POST", withBody: data, withHeaders: nil, withServerUrl: serverUrl, completionHandler: completionHandler)
    }
    
    public func fetchUserProfilePicture(userId: String, withServerUrl serverUrl: String, completionHandler: @escaping ResponseHandler) {
        let endpoint = "/users/\(userId)/image"
        let url = buildApiUrl(serverUrl, endpoint)
        
        return request(url, withMethod: "GET", withServerUrl: serverUrl, completionHandler: completionHandler)
    }
}
