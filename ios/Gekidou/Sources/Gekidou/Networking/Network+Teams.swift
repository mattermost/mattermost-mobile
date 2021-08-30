//
//  Network+Teams.swift
//  
//
//  Created by Miguel Alatzar on 8/27/21.
//

import Foundation

extension Network {
    public func fetchTeam(withId teamId: String, withServerUrl serverUrl: String, completionHandler: @escaping ResponseHandler) {
        let endpoint = "/teams/\(teamId)"
        let url = buildApiUrl(serverUrl, endpoint)
        
        return request(url, withMethod: "GET", withServerUrl: serverUrl, completionHandler: completionHandler)
    }
    
    public func fetchTeamMembership(withTeamId teamId: String, withUserId userId: String, withServerUrl serverUrl: String, completionHandler: @escaping ResponseHandler) {
        let endpoint = "/teams/\(teamId)/members/\(userId)"
        let url = buildApiUrl(serverUrl, endpoint)
        
        return request(url, withMethod: "GET", withServerUrl: serverUrl, completionHandler: completionHandler)
    }
}
