//
//  Network+Channels.swift
//  
//
//  Created by Miguel Alatzar on 8/27/21.
//

import Foundation

extension Network {
    public func fetchChannel(withId channelId: String, withServerUrl serverUrl: String, completionHandler: @escaping ResponseHandler) {
        let url = URL(string: "\(serverUrl)/api/v4/channels/\(channelId)")!
        
        return request(url, withMethod: "GET", withServerUrl: serverUrl, completionHandler: completionHandler)
    }
}
