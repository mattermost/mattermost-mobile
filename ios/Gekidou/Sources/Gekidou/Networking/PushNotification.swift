//
//  File.swift
//  
//
//  Created by Miguel Alatzar on 8/26/21.
//

import Foundation
import UserNotifications

public struct AckNotification: Codable {
    let type: String
    let id: String
    let postId: String?
    public let serverUrl: String
    public let isIdLoaded: Bool
    let receivedAt:Int
    let platform = "ios"
    
    public enum AckNotificationKeys: String, CodingKey {
        case type
        case id = "ack_id"
        case postId = "post_id"
        case serverUrl = "server_url"
        case isIdLoaded = "is_id_loaded"
             
    }
    
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: AckNotificationKeys.self)
        id = try container.decode(String.self, forKey: .id)
        type = try container.decode(String.self, forKey: .type)
        postId = try? container.decode(String.self, forKey: .postId)
        isIdLoaded = (try? container.decode(Bool.self, forKey: .isIdLoaded)) == true
        receivedAt = Date().millisecondsSince1970
        
        if let decodedServerUrl = try? container.decode(String.self, forKey: .serverUrl) {
            serverUrl = decodedServerUrl
        } else {
            serverUrl = try Database.default.getOnlyServerUrl()
        }
    }
}

extension Network {
    @objc public func postNotificationReceipt(_ userInfo: [AnyHashable:Any]) {
        if let jsonData = try? JSONSerialization.data(withJSONObject: userInfo),
           let ackNotification = try? JSONDecoder().decode(AckNotification.self, from: jsonData) {
            postNotificationReceipt(ackNotification, completionHandler: {_, _, _ in})
        }
    }
    
    public func postNotificationReceipt(_ ackNotification: AckNotification, completionHandler: @escaping ResponseHandler) {
        do {
            let jsonData = try JSONEncoder().encode(ackNotification)
            let headers = ["Content-Type": "application/json; charset=utf-8"]
            let endpoint = "/notifications/ack"
            let url = buildApiUrl(ackNotification.serverUrl, endpoint)
            request(url, withMethod: "POST", withBody: jsonData, withHeaders: headers, withServerUrl: ackNotification.serverUrl, completionHandler: completionHandler)
        } catch {
            
        }
        
    }
    
    public func fetchAndStoreDataForPushNotification(_ notification: UNMutableNotificationContent, withContentHandler contentHandler: ((UNNotificationContent) -> Void)?) {
        // TODO: All DB writes should be made in a single transaction
        let operation = BlockOperation {
            let group = DispatchGroup()
            var channel: Channel? = nil
            var channelMembership: ChannelMembership?
        
            let teamId = notification.userInfo["team_id"] as! String?
            let channelId = notification.userInfo["channel_id"] as! String
            let serverUrl =  notification.userInfo["server_url"] as! String
            let currentUserId = try! Database.default.queryCurrentUserId(serverUrl)

            if let teamId = teamId {
                if try! !Database.default.hasMyTeam(withId: teamId, withServerUrl: serverUrl) {
                    group.enter()
                    self.fetchTeam(withId: teamId, withServerUrl: serverUrl) { data, response, error in
                        if self.responseOK(response), let data = data {
                            let team = try! JSONDecoder().decode(Team.self, from: data)
                            try! Database.default.insertTeam(team, serverUrl)
                        }
                        
                        group.leave()
                    }
                    
                    group.enter()
                    self.fetchTeamMembership(withTeamId: teamId, withUserId: currentUserId, withServerUrl: serverUrl) { data, response, error in
                        if self.responseOK(response), let data = data {
                            let teamMembership = try! JSONDecoder().decode(TeamMembership.self, from: data)
                            if teamMembership.user_id == currentUserId {
                                try! Database.default.insertMyTeam(teamMembership, serverUrl)
                            }
                        }
                        
                        group.leave()
                    }
                }
            }
            

            group.enter()
            self.fetchChannel(withId: channelId, withServerUrl: serverUrl) { data, response, error in
                if self.responseOK(response), let data = data {
                    channel = try! JSONDecoder().decode(Channel.self, from: data)
                }

                group.leave()
            }
            
            group.enter()
            self.fetchChannelMembership(withChannelId: channelId, withUserId: currentUserId, withServerUrl: serverUrl) { data, response, error in
                if self.responseOK(response), let data = data {
                    channelMembership = try! JSONDecoder().decode(ChannelMembership.self, from: data)
                }

                group.leave()
            }

            group.enter()
            let since = try! Database.default.queryPostsSinceForChannel(withId: channelId, withServerUrl: serverUrl)
            self.fetchPostsForChannel(withId: channelId, withSince: since, withServerUrl: serverUrl) { data, response, error in
                if self.responseOK(response), let data = data {
                   let postData = try! JSONDecoder().decode(PostData.self, from: data)
                   if postData.posts.count > 0 {
                        try! Database.default.handlePostData(postData, channelId, serverUrl, since != nil)
                    }
                }
                
                group.leave()
            }
            
            group.wait()
            
            try! Database.default.handleChannelAndMembership(channel, channelMembership, serverUrl)
            
            if let contentHandler = contentHandler {
                contentHandler(notification)
            }
        }

        queue.addOperation(operation)
    }
}
