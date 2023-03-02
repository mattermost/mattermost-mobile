import Foundation
import os.log
import SQLite
import UserNotifications

public struct PushNotificationData: Encodable {
    public var categories: CategoriesWithOrder? = nil
    public var categoryChannels: [CategoryChannel]? = nil
    public var channel: Channel? = nil
    public var myChannel: ChannelMember? = nil
    public var team: Team? = nil
    public var myTeam: TeamMember? = nil
    public var posts: PostResponse? = nil
    public var users = [User]()
    public var threads: [PostThread]? = nil
    
    public enum PushNotificationDataKeys: String, CodingKey {
        case categories, categoryChannels, channel, myChannel, team, myTeam, posts, users, threads
    }
    
    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: PushNotificationDataKeys.self)
        try container.encodeIfPresent(self.categories, forKey: .categories)
        try container.encodeIfPresent(self.categoryChannels, forKey: .categoryChannels)
        try container.encodeIfPresent(self.channel, forKey: .channel)
        try container.encodeIfPresent(self.myChannel, forKey: .myChannel)
        try container.encodeIfPresent(self.team, forKey: .team)
        try container.encodeIfPresent(self.myTeam, forKey: .myTeam)
        try container.encodeIfPresent(self.posts, forKey: .posts)
        try container.encode(self.users, forKey: .users)
        try container.encodeIfPresent(self.threads, forKey: .threads)
    }
}

extension PushNotification {
    public func fetchDataForPushNotification(_ notification: [AnyHashable:Any], withContentHandler contentHander: @escaping ((_ data: PushNotificationData) -> Void)) {
        let operation = BlockOperation {
            os_log(OSLogType.default, "Mattermost Notifications: Fetch notification data.")
            let fetchGroup = DispatchGroup()
            
            let teamId = notification["team_id"] as? String ?? ""
            let channelId = notification["channel_id"] as? String
            let postId = notification["post_id"] as? String
            let rootId = notification["root_id"] as? String ?? ""
            var serverUrl =  notification["server_url"] as? String
            let serverId = notification["server_id"] as? String
            let isCRTEnabled = notification["is_crt_enabled"] as? Bool ?? false
            
            if let serverId = serverId,
               serverUrl == nil {
                serverUrl = try? Database.default.getServerUrlForServer(serverId)
            }
            
            guard let serverUrl = serverUrl,
                  let channelId = channelId,
                  let _ = postId
            else { return }
            
            var notificationData = PushNotificationData()
            if !teamId.isEmpty {
                fetchGroup.enter()
                Network.default.fetchTeamIfNeeded(withId: teamId, forServerUrl: serverUrl) { team, myTeam in
                    notificationData.team = team
                    notificationData.myTeam = myTeam
                    fetchGroup.leave()
                }
            }
            
            fetchGroup.enter()
            Network.default.fetchMyChannel(withId: channelId, forServerUrl: serverUrl) { channel, myChannel, profiles in
                notificationData.channel = channel
                notificationData.myChannel = myChannel
                
                if let profiles = profiles {
                    notificationData.users.append(contentsOf: profiles)
                }
                fetchGroup.leave()
            }
            
            if let _ = notificationData.myTeam,
               !teamId.isEmpty {
                fetchGroup.enter()
                Network.default.fetchCategories(withTeamId: teamId, forServerUrl: serverUrl) { categoriesWithOrder in
                    if let categoriesWithOrder = categoriesWithOrder {
                        notificationData.categories = categoriesWithOrder
                    }
                    fetchGroup.leave()
                }
            } else if let channel = notificationData.channel {
                if let categoryChannels = self.addChannelToDefaultCategoryIfNeeded(channel, forServerUrl: serverUrl) {
                    notificationData.categoryChannels = categoryChannels
                }
            }
            
            fetchGroup.enter()
            Network.default.fetchPosts(forChannelId: channelId, andRootId: rootId, havingCRTEnabled: isCRTEnabled, withAlreadyLoadedProfiles: notificationData.users, forServerUrl: serverUrl) { postResponse, threads, users in
                notificationData.posts = postResponse
                notificationData.threads = threads
                if let users = users {
                    notificationData.users.append(contentsOf: users)
                }
                fetchGroup.leave()
            }
            
            fetchGroup.notify(queue: DispatchQueue.main) {
                if isCRTEnabled && !rootId.isEmpty {
                    Network.default.fetchThread(byId: rootId, belongingToTeamId: teamId, forServerUrl: serverUrl) { thread in
                        if let thread = thread {
                            if notificationData.threads == nil {
                                notificationData.threads = [thread]
                            }
                            if let threads = notificationData.threads,
                               let index = threads.firstIndex(where: { $0.id == thread.id }) {
                                var copy = threads[index]
                                copy.unreadMentions = thread.unreadMentions
                                copy.unreadReplies = thread.unreadReplies
                                copy.lastReplyAt = thread.lastReplyAt
                                copy.lastViewedAt = thread.lastViewedAt
                                notificationData.threads?[index] = copy
                            }
                        }
                        contentHander(notificationData);
                    }
                } else {
                    contentHander(notificationData);
                }
            }
        }
        
        queue.addOperation(operation)
    }
    
    public func fetchAndStoreDataForPushNotification(_ notification: UNMutableNotificationContent, withContentHandler contentHandler: @escaping ((UNNotificationContent) -> Void)) {
        guard let serverUrl =  notification.userInfo["server_url"] as? String,
              let channelId = notification.userInfo["channel_id"] as? String
        else {
            contentHandler(notification)
            return
        }
        
        let isCRTEnabled = notification.userInfo["is_crt_enabled"] as? Bool ?? false
        let rootId = notification.userInfo["root_id"] as? String ?? ""
        let teamId = notification.userInfo["team_id"] as? String ?? ""

        fetchDataForPushNotification(notification.userInfo) { data in
            if let db = try? Database.default.getDatabaseForServer(serverUrl) {
                try? db.transaction {
                    let receivingThreads = isCRTEnabled && !rootId.isEmpty
                    if let team = data.team {
                        try? Database.default.insertTeam(db, team)
                    }
                    
                    if let myTeam = data.myTeam {
                        try? Database.default.insertMyTeam(db, myTeam)
                    }
                    
                    if let categories = data.categories {
                        try? Database.default.insertCategoriesWithChannels(db, categories.categories)
                    }
                    
                    if let categoryChannels = data.categoryChannels,
                       !categoryChannels.isEmpty {
                        try? Database.default.insertChannelToDefaultCategory(db, categoryChannels)
                    }
                    
                    if let channel = data.channel,
                       !Database.default.queryChannelExists(withId: channel.id, forServerUrl: serverUrl) {
                        try? Database.default.insertChannel(db, channel)
                    }
                    
                    if var myChannel = data.myChannel {
                        var lastFetchedAt: Double = 0
                        if let postResponse = data.posts, !receivingThreads {
                            let posts = Array(postResponse.posts.values)
                            if let fetchedAt = posts.map({max($0.createAt, $0.updateAt, $0.deleteAt)}).max() {
                                lastFetchedAt = fetchedAt
                            }
                        }
                        var lastPostAt: Double = 0
                        if let channel = data.channel {
                            lastPostAt = isCRTEnabled ? channel.lastRootPostAt : channel.lastPostAt
                            myChannel.internalMsgCount = channel.totalMsgCount - myChannel.msgCount
                            myChannel.internalMsgCountRoot = channel.totalMsgCountRoot - myChannel.msgCountRoot
                        }
                        try? Database.default.insertOrUpdateMyChannel(db, myChannel, isCRTEnabled, lastFetchedAt, lastPostAt)
                    }
                    
                    if let posts = data.posts {
                        try? Database.default.handlePostData(db, posts, channelId, receivingThreads)
                    }
                    
                    if let threads = data.threads {
                        try? Database.default.handleThreads(db, threads, forTeamId: teamId)
                    }
                    
                    if !data.users.isEmpty {
                        try? Database.default.insertUsers(db, data.users)
                    }
                }
            }
            
            notification.badge = Gekidou.Database.default.getTotalMentions() as NSNumber
            contentHandler(notification)
        }
    }
}
