//
//  File.swift
//  
//
//  Created by Miguel Alatzar on 8/26/21.
//

import Foundation
import UserNotifications
import SQLite

public struct AckNotification: Codable {
    let type: String
    let id: String
    let postId: String?
    public let serverUrl: String
    public let isIdLoaded: Bool
    let receivedAt:Int
    let platform = "ios"
    
    public enum AckNotificationKeys: String, CodingKey {
        case type = "type"
        case id = "ack_id"
        case postId = "post_id"
        case server_id = "server_id"
        case isIdLoaded = "id_loaded"
        case platform = "platform"
    }
    
    public enum AckNotificationRequestKeys: String, CodingKey {
        case type = "type"
        case id = "id"
        case postId = "post_id"
        case isIdLoaded = "is_id_loaded"
        case receivedAt = "received_at"
        case platform = "platform"
    }
    
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: AckNotificationKeys.self)
        id = try container.decode(String.self, forKey: .id)
        type = try container.decode(String.self, forKey: .type)
        postId = try? container.decode(String.self, forKey: .postId)
        if container.contains(.isIdLoaded) {
            isIdLoaded = (try? container.decode(Bool.self, forKey: .isIdLoaded)) == true
        } else {
            isIdLoaded = false
        }
        receivedAt = Date().millisecondsSince1970
        
        if let decodedIdentifier = try? container.decode(String.self, forKey: .server_id) {
            serverUrl = try Database.default.getServerUrlForServer(decodedIdentifier)
        } else {
            serverUrl = try Database.default.getOnlyServerUrl()
        }
    }
}

extension AckNotification {
    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: AckNotificationRequestKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(postId, forKey: .postId)
        try container.encode(receivedAt, forKey: .receivedAt)
        try container.encode(platform, forKey: .platform)
        try container.encode(type, forKey: .type)
        try container.encode(isIdLoaded, forKey: .isIdLoaded)
    }
}

extension String {
    func removePrefix(_ prefix: String) -> String {
        guard self.hasPrefix(prefix) else { return self }
        return String(self.dropFirst(prefix.count))
    }
}

extension Network {
    @objc public func postNotificationReceipt(_ userInfo: [AnyHashable:Any]) {
        if let jsonData = try? JSONSerialization.data(withJSONObject: userInfo),
           let ackNotification = try? JSONDecoder().decode(AckNotification.self, from: jsonData) {
            postNotificationReceipt(ackNotification, completionHandler: {_, _, _ in})
        }
    }
    
    private func matchUsername(in message: String) -> [String] {
        let specialMentions = Set(["all", "here", "channel"])
        do {
            let regex = try NSRegularExpression(pattern: "\\B@(([a-z0-9-._]*[a-z0-9_])[.-]*)", options: [.caseInsensitive])
            let results = regex.matches(in: message, range: _NSRange(message.startIndex..., in: message))
            return results.map{ String(message[Range($0.range, in: message)!]).removePrefix("@") }.filter{ !specialMentions.contains($0)}
        } catch let error {
            print("invalid regex: \(error.localizedDescription)")
                    return []
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
        let operation = BlockOperation {
            let group = DispatchGroup()
            
            let channelId = notification.userInfo["channel_id"] as! String
            let rootId = notification.userInfo.index(forKey: "root_id") != nil ? notification.userInfo["root_id"] as! String : ""
            let serverUrl =  notification.userInfo["server_url"] as! String
            let isCRTEnabled = notification.userInfo["is_crt_enabled"] as! Bool
            let currentUser = try! Database.default.queryCurrentUser(serverUrl)
            let currentUserId = currentUser?[Expression<String>("id")]
            let currentUsername = currentUser?[Expression<String>("username")]
            
            var postData: PostData? = nil
            var myChannelData: ChannelMemberData? = nil
            var threadData: ThreadData? = nil
            var threads: [Post] = []
            var userIdsToLoad: Set<String> = Set()
            var usernamesToLoad: Set<String> = Set()
            var users: Set<User> = Set()

            if isCRTEnabled && !rootId.isEmpty {
                // Fetch the thread mentions
                let teamId = Gekidou.Database.default.queryTeamIdForChannel(withId: channelId, withServerUrl: serverUrl) ?? ""

                if !teamId.isEmpty {
                    group.enter()
                    self.fetchThreadMentions(teamId: teamId, threadId: rootId, withServerUrl: serverUrl, completionHandler: {data, response, error in
                        if self.responseOK(response), let data = data {
                            threadData = try? JSONDecoder().decode(ThreadData.self, from: data)
                        }
                        group.leave()
                    })
                }
            } else {
                // Fetch the channel mentions
                group.enter()
                self.fetchChannelMentions(channelId: channelId, withServerUrl: serverUrl, completionHandler: { data, response, error in
                    if self.responseOK(response), let data = data {
                        myChannelData = try? JSONDecoder().decode(ChannelMemberData.self, from: data)
                    }
                    group.leave()
                })
            }
            
            
            group.enter()
            let since = try? Database.default.queryPostsSinceForChannel(withId: channelId, withServerUrl: serverUrl)
            self.fetchPostsForChannel(withId: channelId, withSince: since, withServerUrl: serverUrl, withIsCRTEnabled: isCRTEnabled, withRootId: rootId) { data, response, error in
                if self.responseOK(response), let data = data {
                   postData = try! JSONDecoder().decode(PostData.self, from: data)
                    if postData?.posts.count ?? 0 > 0 {
                        var authorIds: Set<String> = Set()
                        var usernames: Set<String> = Set()

                        var threadParticipantUserIds: Set<String> = Set() // Used to exclude the "userIds" present in the thread participants
                        var threadParticipantUsernames: Set<String> = Set() // Used to exclude the "usernames" present in the thread participants
                        var threadParticipantUsers = [String: User]() // All unique users from thread participants are stored here

                        postData!.posts.forEach{post in
                            if (currentUserId != nil && post.user_id != currentUserId) {
                                authorIds.insert(post.user_id)
                            }
                            self.matchUsername(in: post.message).forEach{
                                if ($0 != currentUsername) {
                                    usernames.insert($0)
                                }
                            }

                            if (isCRTEnabled) {
                                // Add root post as a thread
                                let rootId = post.root_id
                                if (rootId.isEmpty) {
                                    threads.append(post)
                                }

                                let participants = post.participants ?? []
                                if (participants.count > 0) {
                                    participants.forEach { participant in
                                        let userId = participant.id
                                        if (userId != currentUserId) {
                                            threadParticipantUserIds.insert(userId)
                                            if (threadParticipantUsers[userId] == nil) {
                                                threadParticipantUsers[userId] = participant
                                            }
                                        }

                                        let username = participant.username
                                        if (username != "" && username != currentUsername) {
                                            threadParticipantUsernames.insert(username)
                                        }
                                    }
                                }
                            }
                        }

                        if (authorIds.count > 0) {
                            if let existingIds = try? Database.default.queryUsers(byIds: authorIds, withServerUrl: serverUrl) {
                                userIdsToLoad = authorIds.filter { !existingIds.contains($0) }
                                // Filter the users found in the thread participants list
                                if (threadParticipantUserIds.count > 0) {
                                    userIdsToLoad = userIdsToLoad.filter{ !threadParticipantUserIds.contains($0) }
                                }
                                if (userIdsToLoad.count > 0) {
                                    group.enter()
                                    self.fetchUsers(byIds: Array(userIdsToLoad), withServerUrl: serverUrl) { data, response, error in
                                        if self.responseOK(response), let data = data {
                                            let usersData = try! JSONDecoder().decode([User].self, from: data)
                                            usersData.forEach { users.insert($0) }
                                        }
                                        group.leave()
                                    }
                                }
                            }
                        }

                        if (usernames.count > 0) {
                            if let existingUsernames = try? Database.default.queryUsers(byUsernames: usernames, withServerUrl: serverUrl) {
                                usernamesToLoad = usernames.filter{ !existingUsernames.contains($0)}
                                // Filter the users found in the thread participants list
                                if (threadParticipantUsernames.count > 0) {
                                    usernamesToLoad = usernamesToLoad.filter{ !threadParticipantUsernames.contains($0) }
                                }
                                if (usernamesToLoad.count > 0) {
                                    group.enter()

                                    self.fetchUsers(byUsernames: Array(usernamesToLoad), withServerUrl: serverUrl) { data, response, error in
                                        if self.responseOK(response), let data = data {
                                            let usersData = try! JSONDecoder().decode([User].self, from: data)
                                            usersData.forEach { users.insert($0) }
                                        }
                                        group.leave()
                                    }
                                }
                            }
                        }

                        if (threadParticipantUserIds.count > 0) {
                            if let existingThreadParticipantUserIds = try? Database.default.queryUsers(byIds: threadParticipantUserIds, withServerUrl: serverUrl) {
                                threadParticipantUsers.forEach { (userId: String, user: User) in
                                    if (!existingThreadParticipantUserIds.contains(userId)) {
                                        users.insert(user)
                                    }
                                }
                            }
                            
                        }
                        
                    }
                }
                
                group.leave()
            }
            
            group.wait()

            group.enter()
            if (postData != nil && postData?.posts != nil && postData!.posts.count > 0) {
                if let db = try? Database.default.getDatabaseForServer(serverUrl) {
                    let receivingThreads = isCRTEnabled && !rootId.isEmpty
                    try? db.transaction {
                        try? Database.default.handlePostData(db, postData!, channelId, since != nil, receivingThreads)
                        
                        if threads.count > 0 {
                            try? Database.default.handleThreads(db, threads)
                        }
                        
                        if users.count > 0 {
                            try? Database.default.insertUsers(db, users)
                        }
                        
                        if myChannelData != nil {
                            try? Database.default.handleMyChannelMentions(db, myChannelData!, withCRTEnabled: isCRTEnabled)
                        }
                        
                        if threadData != nil {
                            try? Database.default.handleThreadMentions(db, threadData!)
                        }
                    }
                }
            }
            group.leave()

            if let contentHandler = contentHandler {
                // Get the total mentions from all databases and set the badge icon
                notification.badge = Gekidou.Database.default.getTotalMentions() as NSNumber
                contentHandler(notification)
            }
        }

        queue.addOperation(operation)
    }
}
