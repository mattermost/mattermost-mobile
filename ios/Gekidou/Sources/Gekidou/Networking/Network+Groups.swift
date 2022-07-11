//
//  Network+Channels.swift
//
//
//  Created by Miguel Alatzar on 8/27/21.
//

import Foundation

extension Network {
    public func fetchGroups(byName name: String, withServerUrl serverUrl: String, completionHandler: @escaping ResponseHandler) {
        let endpoint = "groups?q=" + name
        let url = buildApiUrl(serverUrl, endpoint)
        return request(url, withMethod: "POST", withBody: nil, withHeaders: nil, withServerUrl: serverUrl, completionHandler: completionHandler)
    }
}
