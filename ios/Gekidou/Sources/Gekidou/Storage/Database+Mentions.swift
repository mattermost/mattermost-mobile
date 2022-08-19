import Foundation
import SQLite

extension Database {
    public func hasMyChannel(_ db: Connection, channelId: String) -> Bool {
        let idCol = Expression<String>("id")
        let query = myChannelTable.where(idCol == channelId)
        if let _ = try? db.pluck(query) {
            return true
        }
        
        return false
    }
    
    public func hasThread(_ db: Connection, threadId: String) -> Bool {
        let idCol = Expression<String>("id")
        let query = threadTable.where(idCol == threadId)
        if let _ = try? db.pluck(query) {
            return true
        }
        
        return false
    }
    
    public func getTotalMentions() -> Int {
        let serverUrls = getAllActiveServerUrls()
        var mentions = 0
        for serverUrl in serverUrls {
            if let db = try? getDatabaseForServer(serverUrl) {
                mentions += (getChannelMentions(db) + getThreadMentions(db))
            }
        }
        
        return mentions
    }
    
    public func getChannelMentions(_ db: Connection) -> Int {
        let mentionsCol = Expression<Int?>("mentions_count")
        let mentions = try? db.scalar(myChannelTable.select(mentionsCol.total))
        return Int(mentions ?? 0)
    }
    
    public func getThreadMentions(_ db: Connection) -> Int {
        let mentionsCol = Expression<Int?>("unread_mentions")
        let mentions = try? db.scalar(threadTable.select(mentionsCol.total))
        return Int(mentions ?? 0)
    }
    
    public func handleMyChannelMentions(_ db: Connection, _ channelMemberData: ChannelMemberData, withCRTEnabled crtEnabled: Bool) throws {
        let idCol = Expression<String>("id")
        let mentionsCol = Expression<Int>("mentions_count")
        let isUnreadCol = Expression<Bool>("is_unread")
        let mentions = crtEnabled ? channelMemberData.mention_count_root : channelMemberData.mention_count
        
        if hasMyChannel(db, channelId: channelMemberData.channel_id) {
            let updateQuery = myChannelTable
                .where(idCol == channelMemberData.channel_id)
                .update(mentionsCol <- mentions,
                        isUnreadCol <- true
                )
            let _ = try db.run(updateQuery)
        } else {
            let msgCol = Expression<Int>("message_count")
            let lastPostAtCol = Expression<Int64>("last_post_at")
            let lastViewedAtCol = Expression<Int64>("last_viewed_at")
            let viewedAtCol = Expression<Int64>("viewed_at")
            let lastFetchedAtCol = Expression<Int64>("last_fetched_at")
            let manuallyUnreadCol = Expression<Bool>("manually_unread")
            let rolesCol = Expression<String>("roles")
            let statusCol = Expression<String>("status")

            let setters: [Setter] = [
                idCol <- channelMemberData.channel_id,
                mentionsCol <- mentions,
                msgCol <- mentions,
                lastPostAtCol <- channelMemberData.last_update_at,
                lastViewedAtCol <- channelMemberData.last_viewed_at,
                viewedAtCol <- 0,
                lastFetchedAtCol <- 0,
                isUnreadCol <- true,
                manuallyUnreadCol <- false,
                rolesCol <- channelMemberData.roles,
                statusCol <- "created"
            ]
            
            let insertQuery = myChannelTable.insert(setters)
            let _ = try db.run(insertQuery)
        }
    }
    
    public func handleThreadMentions(_ db: Connection, _ threadData: ThreadData) throws {
        let idCol = Expression<String>("id")
        let unreadMentionsCol = Expression<Int>("unread_mentions")

        if hasThread(db, threadId: threadData.id) {
            let updateQuery = threadTable
                .where(idCol == threadData.id)
                .update(unreadMentionsCol <- threadData.unread_mentions)
            let _ = try db.run(updateQuery)
        } else {
            let lastReplyAtCol = Expression<Int64>("last_reply_at")
            let lastViewedAtCol = Expression<Int64>("last_viewed_at")
            let viewedAtCol = Expression<Int64>("viewed_at")
            let lastFetchedAtCol = Expression<Int64>("last_fetched_at")
            let isFollowingCol = Expression<Bool>("is_following")
            let unreadRepliesCol = Expression<Int>("unread_replies")
            let replyCountCol = Expression<Int>("reply_count")
            let statusCol = Expression<String>("status")

            let setters: [Setter] = [
                idCol <- threadData.id,
                unreadMentionsCol <- threadData.unread_mentions,
                lastReplyAtCol <- threadData.last_reply_at,
                lastViewedAtCol <- threadData.last_viewed_at,
                viewedAtCol <- 0,
                lastFetchedAtCol <- 0,
                isFollowingCol <- true,
                unreadRepliesCol <- threadData.unread_replies,
                replyCountCol <- threadData.reply_count,
                statusCol <- "created"
            ]
            
            let insertQuery = threadTable.insert(setters)
            let _ = try db.run(insertQuery)
        }
    }
    
    public func resetMyChannelMentions(_ serverUrl: String, _ channelId: String) throws {
        if let db = try? getDatabaseForServer(serverUrl) {
            let idCol = Expression<String>("id")
            let mentionsCol = Expression<Int>("mentions_count")
            let msgCol = Expression<Int>("message_count")
            let isUnreadCol = Expression<Bool>("is_unread")
            if hasMyChannel(db, channelId: channelId) {
                let updateQuery = myChannelTable
                    .where(idCol == channelId)
                    .update(mentionsCol <- 0,
                            msgCol <- 0,
                            isUnreadCol <- false
                    )
                let _ = try db.run(updateQuery)
            }
        }
    }
    
    public func resetThreadMentions(_ serverUrl: String, _ rootId: String) throws {
        if let db = try? getDatabaseForServer(serverUrl) {
            let idCol = Expression<String>("id")
            let mentionsCol = Expression<Int>("unread_mentions")
            let msgCol = Expression<Int>("unread_replies")
            if hasThread(db, threadId: rootId) {
                let updateQuery = threadTable
                    .where(idCol == rootId)
                    .update(mentionsCol <- 0, msgCol <- 0)
                let _ = try db.run(updateQuery)
            }
        }
    }
}
