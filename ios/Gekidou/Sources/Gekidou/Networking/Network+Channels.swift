//
//  Network+Channels.swift
//  
//
//  Created by Miguel Alatzar on 8/27/21.
//

import Foundation

extension Network {
    public func fetchChannel(withId channelId: String, withServerUrl serverUrl: String, completionHandler: @escaping ResponseHandler) {
        let endpoint = "/channels/\(channelId)"
        let url = buildApiUrl(serverUrl, endpoint)
        
        return request(url, withMethod: "GET", withServerUrl: serverUrl, completionHandler: completionHandler)
    }
    
    public func fetchChannelMembership(withChannelId channelId: String, withUserId userId: String, withServerUrl serverUrl: String, completionHandler: @escaping ResponseHandler) {
        let endpoint = "/channels/\(channelId)/members/\(userId)"
        let url = buildApiUrl(serverUrl, endpoint)
        
        return request(url, withMethod: "GET", withServerUrl: serverUrl, completionHandler: completionHandler)
    }
}
