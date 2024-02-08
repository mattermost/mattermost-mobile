//
//  Network+Posts.swift
//  
//
//  Created by Miguel Alatzar on 8/26/21.
//

import Foundation

public typealias PostsHandler = (_ postResponse: PostResponse?, _ threads: [PostThread]?, _ users: [User]?) -> Void

extension Network {
    public func createPost(serverUrl: String, channelId: String, message: String, fileIds: [String], completionHandler: @escaping ResponseHandler) {
        do {
            if !message.isEmpty || !fileIds.isEmpty {
                let json: [String: Any] = [
                    "channel_id": channelId,
                    "message": message,
                    "file_ids": fileIds
                ]
                let data = try JSONSerialization.data(withJSONObject: json, options: .prettyPrinted)
                let headers = ["Content-Type": "application/json; charset=utf-8"]
                let endpoint = "/posts"
                let url = buildApiUrl(serverUrl, endpoint)
                request(
                    url,
                    withMethod: "POST",
                    withBody: data,
                    andHeaders: headers,
                    forServerUrl: serverUrl,
                    completionHandler: completionHandler
                )
            }
        } catch {
            
        }
    }
    
    public func fetchPosts(forChannelId channelId: String, andRootId rootId: String, havingCRTEnabled isCRTEnabled: Bool, withAlreadyLoadedProfiles loadedProfiles: [User], forServerUrl serverUrl: String, completionHandler: @escaping PostsHandler) {
        let additionalParams = isCRTEnabled ? "&collapsedThreads=true&collapsedThreadsExtended=true" : ""
        let receivingThreads = isCRTEnabled && !rootId.isEmpty
        let endpoint: String
        
        let alreadyLoadedUserIds = loadedProfiles.map { $0.id }
        var postResponse: PostResponse? = nil
        
        if receivingThreads {
            let since = rootId.isEmpty ? nil : Database.default.queryLastPostInThread(withRootId: rootId, forServerUrl: serverUrl)
            let queryParams = since == nil ? "?perPage=60&fromCreateAt=0&direction=up" : "?fromCreateAt=\(Int64(since!))&direction=down"
            endpoint = "/posts/\(rootId)/thread\(queryParams)\(additionalParams)"
        } else {
            let since = Database.default.queryPostsSinceForChannel(withId: channelId, forServerUrl: serverUrl)
            let queryParams = since == nil ? "?page=0&per_page=60" : "?since=\(Int64(since!))"
            endpoint = "/channels/\(channelId)/posts\(queryParams)\(additionalParams)"
        }
        
        let url = buildApiUrl(serverUrl, endpoint)
        request(url, usingMethod: "GET", forServerUrl: serverUrl) {data, response, error in
            if let data = data {
                postResponse = try? JSONDecoder().decode(PostResponse.self, from: data)
            }

            DispatchQueue.main.async {
                self.processPostsFetched(postResponse, andAlreadyLoadedProfilesIds: alreadyLoadedUserIds,
                                         usingCRT: isCRTEnabled, forServerUrl: serverUrl,
                                         completionHandler: completionHandler)
            }
        }
    }
    
    private func processPostsFetched(_ postResponse: PostResponse?, andAlreadyLoadedProfilesIds alreadyLoadedUserIds: [String],
                                     usingCRT isCRTEnabled: Bool, forServerUrl serverUrl: String, completionHandler: @escaping PostsHandler) {
        guard let currentUserRow = try? Database.default.queryCurrentUser(serverUrl),
              let currentUser = Database.default.getUserFromRow(currentUserRow)
        else {
            completionHandler(nil, nil, nil)
            return
        }

        var users: [User]? = nil
        var threads: [PostThread]? = nil
        var threadParticipantUserIds: Set<String> = Set() // Used to exclude the "userIds" present in the thread participants
        var threadParticipantUsernames: Set<String> = Set() // Used to exclude the "usernames" present in the thread participants
        var threadParticipantUsers = [String: User]() // All unique users from thread participants are stored here
        var userIdsToLoad: Set<String> = Set()
        var usernamesToLoad: Set<String> = Set()
        
        func findNeededUsernames(text: String?) {
            if let text = text {
                for username in self.matchUsername(in: text) {
                    if username != currentUser.username && !threadParticipantUsernames.contains(username) && !usernamesToLoad.contains(username) {
                        usernamesToLoad.insert(username)
                    }
                }
            }
        }

        if let postsWithKeys = postResponse?.posts {
            let posts = Array(postsWithKeys.values)
            for post in posts {
                let authorId = post.userId
                let message = post.message
                let attachments = post.props["attachments"] as? [[String: Any]]
                
                if isCRTEnabled && post.rootId.isEmpty {
                    if threads == nil {
                        threads = [PostThread]()
                    }
                    threads?.append(PostThread(from: post))
                }
                
                if let participants = post.participants {
                    for participant in participants {
                        let userId = participant.id
                        let username = participant.username
                        if userId != currentUser.id && !alreadyLoadedUserIds.contains(userId) && !threadParticipantUserIds.contains(userId) {
                            threadParticipantUserIds.insert(userId)
                            if threadParticipantUsers[userId] == nil {
                                threadParticipantUsers[userId] = participant
                            }
                        }
                        
                        if !username.isEmpty && username != currentUser.username && !threadParticipantUsernames.contains(username) {
                            threadParticipantUsernames.insert(username)
                        }
                    }
                }
                
                if (authorId != currentUser.id && !alreadyLoadedUserIds.contains(authorId) && !threadParticipantUserIds.contains(authorId) && !userIdsToLoad.contains(authorId)) {
                    userIdsToLoad.insert(authorId)
                }

                findNeededUsernames(text: message)
                if let attachments = attachments {
                    for attachment in attachments {
                        let pretext = attachment["pretext"] as? String
                        let text = attachment["text"] as? String
                        findNeededUsernames(text: pretext)
                        findNeededUsernames(text: text)
                    }
                }
            }
            
            if !threadParticipantUsers.isEmpty || !usernamesToLoad.isEmpty || !userIdsToLoad.isEmpty {
                users = [User]()
            }
            
            if !usernamesToLoad.isEmpty || !userIdsToLoad.isEmpty,
               let profiles = Network.default.fetchNeededUsers(userIds: userIdsToLoad, usernames: usernamesToLoad, forServerUrl: serverUrl),
               !profiles.isEmpty {
                users?.append(contentsOf: profiles)
            }
            
            if !threadParticipantUsers.isEmpty {
                let storedParticipantsById = Database.default.queryUsers(byIds: threadParticipantUserIds, forServerUrl: serverUrl)
                let storedParticipantsByUsername = Database.default.queryUsers(byUsernames: threadParticipantUsernames, forServerUrl: serverUrl)
                let participantUsers = Array(threadParticipantUsers.values).filter{ !storedParticipantsById.contains($0.id) && !storedParticipantsByUsername.contains($0.username) }
                if !participantUsers.isEmpty {
                    users?.append(contentsOf: participantUsers)
                }
            }
        }
        
        completionHandler(postResponse, threads, users)
    }

    private func matchUsername(in message: String) -> [String] {
        let specialMentions = Set(["all", "here", "channel"])
        if let regex = try? NSRegularExpression(pattern: "\\B@(([a-z0-9-._]*[a-z0-9_])[.-]*)", options: [.caseInsensitive]) {
            let results = regex.matches(in: message, range: _NSRange(message.startIndex..., in: message))
            if !results.isEmpty {
                let username = results.map({ String(message[Range($0.range, in: message)!]).removePrefix("@") }).filter({ !specialMentions.contains($0)})
                return username
            }
        }
        return []
    }
}
