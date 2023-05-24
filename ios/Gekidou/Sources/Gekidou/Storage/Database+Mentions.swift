import Foundation
import SQLite

extension Database {
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
        let stmtString = """
        SELECT SUM(my.mentions_count) \
        FROM MyChannel my \
        INNER JOIN MyChannelSettings mys ON mys.id=my.id \
        INNER JOIN Channel c INDEXED BY sqlite_autoindex_Channel_1 ON c.id=my.id \
        WHERE c.delete_at = 0 AND mys.notify_props NOT LIKE '%"mark_unread":"mention"%'
        """
        let mentions = try? db.prepare(stmtString).scalar() as? Double
        return Int(mentions ?? 0)
    }

    public func getThreadMentions(_ db: Connection) -> Int {
        let stmtString = """
        SELECT SUM(t.unread_mentions) \
        FROM Thread t \
        INNER JOIN Post p INDEXED BY Post_channel_id ON t.id=p.id \
        INNER JOIN Channel c ON p.channel_id=c.id \
        INNER JOIN MyChannelSettings mys ON mys.id=c.id \
        WHERE c.delete_at = 0 AND mys.notify_props NOT LIKE '%"mark_unread":"mention"%'
        """
        let mentions = try? db.prepare(stmtString).scalar() as? Double
        return Int(mentions ?? 0)
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
