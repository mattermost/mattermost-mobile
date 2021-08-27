//
//  File.swift
//  
//
//  Created by Miguel Alatzar on 8/26/21.
//

import Foundation
import UserNotifications

public struct AckNotification: Codable {
    let id: String
    let type: String
    let postId: String?
    public let serverUrl: String
    public let isIdLoaded: Bool
    let receivedAt:Int
    let platform = "ios"
    
    public enum AckNotificationKeys: String, CodingKey {
        case id
        case type
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
            let url = URL(string: "\(ackNotification.serverUrl)/api/v4/notifications/ack")!
            request(url, withMethod: "POST", withBody: jsonData, withHeaders: headers, withServerUrl: ackNotification.serverUrl, completionHandler: completionHandler)
        } catch {
            
        }
        
    }
    
    public func fetchAndStoreDataForPushNotification(_ notification: UNMutableNotificationContent) {
        let operation = BlockOperation {
            let group = DispatchGroup()
        
            do {
                let teamId = notification.userInfo["team_id"] as! String? // "gmbz93nzk7drpnsxo8ki93q7ca"
                let channelId = notification.userInfo["channel_id"] as! String // "mm5xuerwbibqdrkkfgt4ru6ssh"
                let serverUrl =  notification.userInfo["server_url"] as! String // "http://192.168.0.14:8065"

                if let teamId = teamId {
                    if try! !Database.default.hasTeam(withId: teamId, withServerUrl: serverUrl) {
                        group.enter()
                        
                        self.fetchTeam(withId: teamId, withServerUrl: serverUrl) { data, response, error in
                            if self.responseOK(response), let data = data {
                                let team = try! JSONDecoder().decode(Team.self, from: data)
                                try! Database.default.insertTeam(team, serverUrl)
                            }
                            
                            group.leave()
                        }
                    }
                }
                
                if try !Database.default.hasChannel(withId: channelId, withServerUrl: serverUrl) {
                    group.enter()

                    self.fetchChannel(withId: channelId, withServerUrl: serverUrl) { data, response, error in
                        if self.responseOK(response), let data = data {
                            let channel = try! JSONDecoder().decode(Channel.self, from: data)
                            try! Database.default.insertChannel(channel, serverUrl)
                        }

                        group.leave()
                    }
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
            } catch {
                print("GEKIDOU fetchAndStoreDataForPushNotification error", error)
            }
            
            group.wait()
    }

        queue.addOperation(operation)
    }
}
