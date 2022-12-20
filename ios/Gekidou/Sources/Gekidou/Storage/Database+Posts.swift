//
//  Database+Posts.swift
//  
//
//  Created by Miguel Alatzar on 8/26/21.
//

import Foundation
import SQLite

public struct Post: Codable {
    let id: String
    let create_at: Int64
    let update_at: Int64
    let edit_at: Int64
    let delete_at: Int64
    let is_pinned: Bool
    let user_id: String
    let channel_id: String
    let root_id: String
    let original_id: String
    let message: String
    let type: String
    let props: String
    let pending_post_id: String
    let metadata: String
    var prev_post_id: String
    // CRT
    let participants: [User]?
    let last_reply_at: Int64
    let reply_count: Int
    let is_following: Bool
    
    public enum PostKeys: String, CodingKey {
        case id = "id"
        case create_at = "create_at"
        case update_at = "update_at"
        case delete_at = "delete_at"
        case edit_at = "edit_at"
        case is_pinned = "is_pinned"
        case user_id = "user_id"
        case channel_id = "channel_id"
        case root_id = "root_id"
        case original_id = "original_id"
        case message = "message"
        case type = "type"
        case props = "props"
        case pending_post_id = "pending_post_id"
        case metadata = "metadata"
        // CRT
        case participants = "participants"
        case last_reply_at = "last_reply_at"
        case reply_count = "reply_count"
        case is_following = "is_following"
    }
    
    public init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: PostKeys.self)
        prev_post_id = ""
        id = try values.decode(String.self, forKey: .id)
        create_at = try values.decode(Int64.self, forKey: .create_at)
        update_at = try values.decode(Int64.self, forKey: .update_at)
        delete_at = try values.decode(Int64.self, forKey: .delete_at)
        edit_at = try values.decode(Int64.self, forKey: .edit_at)
        is_pinned = try values.decode(Bool.self, forKey: .is_pinned)
        user_id = try values.decode(String.self, forKey: .user_id)
        channel_id = try values.decode(String.self, forKey: .channel_id)
        root_id = try values.decode(String.self, forKey: .root_id)
        original_id = try values.decode(String.self, forKey: .original_id)
        message = try values.decode(String.self, forKey: .message)
        let meta = try values.decode([String:Any].self, forKey: .metadata)
        metadata = Database.default.json(from: meta) ?? "{}"
        type = try values.decode(String.self, forKey: .type)
        pending_post_id = try values.decode(String.self, forKey: .pending_post_id)
        let propsData = try values.decode([String:Any].self, forKey: .props)
        props = Database.default.json(from: propsData) ?? "{}"
        // CRT
        participants = try values.decodeIfPresent([User].self, forKey: .participants) ?? []
        last_reply_at = try values.decodeIfPresent(Int64.self, forKey: .last_reply_at) ?? 0
        reply_count = try values.decodeIfPresent(Int.self, forKey: .reply_count) ?? 0
        is_following = try values.decodeIfPresent(Bool.self, forKey: .is_following) ?? false
    }
}

struct MetadataSetters {
    let metadata: String
    let reactionSetters: [[Setter]]
    let fileSetters: [[Setter]]
    let emojiSetters: [[Setter]]
}

struct PostSetters {
    let id: String
    let postSetters: [Setter]
    let reactionSetters: [[Setter]]
    let fileSetters: [[Setter]]
    let emojiSetters: [[Setter]]
}

struct ThreadSetters {
    let id: String
    let threadSetters: [Setter]
    let threadParticipantSetters: [[Setter]]
}

extension Database {
    public func queryLastPostCreateAt(withId channelId: String, withServerUrl serverUrl: String) throws -> Int64? {
        let db = try getDatabaseForServer(serverUrl)
        
        let earliestCol = Expression<Int64>("earliest")
        let latestCol = Expression<Int64>("latest")
        let channelIdCol = Expression<String>("channel_id")
        let earliestLatestQuery = postsInChannelTable
            .select(earliestCol, latestCol)
            .where(channelIdCol == channelId)
            .order(latestCol.desc)
            .limit(1)
        
        var earliest: Int64?
        var latest: Int64?
        if let result = try? db.pluck(earliestLatestQuery) {
            earliest = try? result.get(earliestCol)
            latest = try? result.get(latestCol)
        } else {
            return nil
        }
        
        let createAtCol = Expression<Int64>("create_at")
        let deleteAtCol = Expression<Int64>("delete_at")
        var postQuery = postTable
            .select(createAtCol)
            .where(channelIdCol == channelId && deleteAtCol == 0)
        
        if let earliest = earliest, let latest = latest {
            postQuery = postQuery.filter(earliest...latest ~= createAtCol)
        }
        postQuery = postQuery.order(createAtCol.desc).limit(1)
        
        if let result = try db.pluck(postQuery) {
            return try result.get(createAtCol)
        }
        
        return nil
    }
    
    public func queryPostsSinceForChannel(withId channelId: String, withServerUrl serverUrl: String) throws -> Int64? {
        let db = try getDatabaseForServer(serverUrl)

        let idCol = Expression<String>("id")
        let lastFetchedAtColAsDouble = Expression<Double?>("last_fetched_at")
        let lastFetchedAtColAsInt64 = Expression<Int64?>("last_fetched_at")
        let query = myChannelTable.where(idCol == channelId)

        if let result = try? db.pluck(query) {
            let lastFetchAtInt64 = result[lastFetchedAtColAsInt64]
            if lastFetchAtInt64 != nil,
               lastFetchAtInt64! > 0 {
                return lastFetchAtInt64
            }
            if let last = result[lastFetchedAtColAsDouble],
               last > 0 {
                return Int64(last)
            }
        }

        return try queryLastPostCreateAt(withId: channelId, withServerUrl: serverUrl)
    }
    
    private func updateMyChannelLastFetchedAt(_ db: Connection, _ channelId: String, _ latest: Int64) throws {
        let idCol = Expression<String>("id")
        let lastFetchedAtCol = Expression<Int64>("last_fetched_at")
        let statusCol = Expression<String>("_status")
        
        let query = myChannelTable
            .where(idCol == channelId)
            .update(lastFetchedAtCol <- latest, statusCol <- "updated")

        try db.run(query)
    }

    public func handlePostData(_ db: Connection, _ postData: PostData, _ channelId: String, _ usedSince: Bool = false, _ receivingThreads: Bool = false) throws {
        let sortedChainedPosts = chainAndSortPosts(postData)
        try insertOrUpdatePosts(db, sortedChainedPosts, channelId)
        let sortedAndNotDeletedPosts = sortedChainedPosts.filter({$0.delete_at == 0})
        let earliest = sortedAndNotDeletedPosts.first!.create_at
        let latest = sortedAndNotDeletedPosts.last!.create_at
        if (!receivingThreads) {
            try handlePostsInChannel(db, channelId, earliest, latest, usedSince)

            let lastFetchedAt = postData.posts.map({max($0.create_at, $0.update_at, $0.delete_at)}).max()
            try updateMyChannelLastFetchedAt(db, channelId, lastFetchedAt ?? 0)
        }
        try handlePostsInThread(db, postData.posts)
    }
    
    public func handleThreads(_ db: Connection, _ threads: [Post]) throws {
        try insertThreads(db, threads)
    }
    
    private func handlePostsInChannel(_ db: Connection, _ channelId: String, _ earliest: Int64, _ latest: Int64, _ usedSince: Bool = false) throws {
        if usedSince {
            try? updatePostsInChannelLatestOnly(db, channelId, latest)
        } else {
            let updated = try updatePostsInChannelEarliestAndLatest(db, channelId, earliest, latest)
            if (!updated) {
                try? insertPostsInChannel(db, channelId, earliest, latest)
            }
        }
    }
    
    private func handlePostsInThread(_ db: Connection, _ posts: [Post]) throws {
        let postsInThreadSetters = try createPostsInThreadSetters(db, from: posts)
        if !postsInThreadSetters.isEmpty {
            let insertQuery = postsInThreadTable.insertMany(or: .replace, postsInThreadSetters)
            try db.run(insertQuery)
        }
    }
    
    private func chainAndSortPosts(_ postData: PostData) -> [Post] {
        let order = postData.order
        let posts = postData.posts
        var prevPostId = ""
        
        return posts.sorted(by: {$0.create_at < $1.create_at}).enumerated().map { (index, post) in
            var modified = post
            if (index == 0) {
                modified.prev_post_id = postData.prev_post_id
            } else {
                modified.prev_post_id = prevPostId
            }
            
            if (order.contains(post.id)) {
                prevPostId = post.id
            }
            
            return modified
        }
    }
    
    private func updatePostsInChannelLatestOnly(_ db: Connection, _ channelId: String, _ latest: Int64) throws {
        let channelIdCol = Expression<String>("channel_id")
        let latestCol = Expression<Int64>("latest")
        let statusCol = Expression<String>("_status")
        
        let query = postsInChannelTable
            .where(channelIdCol == channelId)
            .order(latestCol.desc)
            .limit(1)
            .update(latestCol <- latest, statusCol <- "updated")
        
        try db.run(query)
    }
    
    private func updatePostsInChannelEarliestAndLatest(_ db: Connection, _ channelId: String, _ earliest: Int64, _ latest: Int64) throws -> Bool {
        let idCol = Expression<String>("id")
        let channelIdCol = Expression<String>("channel_id")
        let earliestCol = Expression<Int64>("earliest")
        let latestCol = Expression<Int64>("latest")
        let statusCol = Expression<String>("_status")
        
        let query = postsInChannelTable
            .where(channelIdCol == channelId && (earliestCol <= earliest || latestCol >= latest))
            .order(latestCol.desc)
            .limit(1)
        
        if let record = try db.pluck(query) {
            let recordId = try record.get(idCol)
            let recordEarliest = try record.get(earliestCol)
            let recordLatest = try record.get(latestCol)
            
            let updateQuery = postsInChannelTable
                .filter(idCol == recordId)
                .update(earliestCol <- min(earliest, recordEarliest), latestCol <- max(latest, recordLatest), statusCol <- "updated")
            
            try db.run(updateQuery)
            
            return true
        }
        
        return false
    }
    
    private func insertPostsInChannel(_ db: Connection, _ channelId: String, _ earliest: Int64, _ latest: Int64) throws {
        let idCol = Expression<String>("id")
        let channelIdCol = Expression<String>("channel_id")
        let earliestCol = Expression<Int64>("earliest")
        let latestCol = Expression<Int64>("latest")
        let statusCol = Expression<String>("_status")
        let id = generateId()
        
        let query = postsInChannelTable
            .insert(idCol <- id, channelIdCol <- channelId, earliestCol <- earliest, latestCol <- latest, statusCol <- "created")
        try db.run(query)
        
        let deleteQuery = postsInChannelTable
            .where(idCol != id &&
                   channelIdCol == channelId &&
                   earliestCol >= earliest &&
                   latestCol <= latest)
            .delete()
        
        try db.run(deleteQuery)
    }
    
    private func insertOrUpdatePosts(_ db: Connection, _ posts: [Post], _ channelId: String) throws {
        let setters = createPostSetters(from: posts)
        for setter in setters {
            let insertPost = postTable.insert(or: .replace, setter.postSetters)
            try db.run(insertPost)
            
            if !setter.emojiSetters.isEmpty {
                let insertEmojis = emojiTable.insertMany(or: .ignore, setter.emojiSetters)
                try db.run(insertEmojis)
            }
            
            if !setter.fileSetters.isEmpty {
                let insertFiles = fileTable.insertMany(or: .ignore, setter.fileSetters)
                try db.run(insertFiles)
            }
            
            if !setter.reactionSetters.isEmpty {
                let postIdCol = Expression<String>("post_id")
                let deletePreviousReactions = reactionTable.where(postIdCol == setter.id).delete()
                try db.run(deletePreviousReactions)
                let insertReactions = reactionTable.insertMany(setter.reactionSetters)
                try db.run(insertReactions)
            }
        }
    }
    
    private func insertThreads(_ db: Connection, _ posts: [Post]) throws {
        let setters = try createThreadSetters(db, from: posts)
        for setter in setters {
            let insertThread = threadTable.insert(or: .replace, setter.threadSetters)
            try db.run(insertThread)

            let threadIdCol = Expression<String>("thread_id")
            let deletePreviousThreadParticipants = threadParticipantTable.where(threadIdCol == setter.id).delete()
            try db.run(deletePreviousThreadParticipants)

            if !setter.threadParticipantSetters.isEmpty {
                let insertThreadParticipants = threadParticipantTable.insertMany(setter.threadParticipantSetters)
                try db.run(insertThreadParticipants)
            }
        }
    }
    
    private func createPostSetters(from posts: [Post]) -> [PostSetters] {
        let id = Expression<String>("id")
        let createAt = Expression<Int64>("create_at")
        let updateAt = Expression<Int64>("update_at")
        let editAt = Expression<Int64>("edit_at")
        let deleteAt = Expression<Int64>("delete_at")
        let isPinned = Expression<Bool>("is_pinned")
        let userId = Expression<String>("user_id")
        let channelId = Expression<String>("channel_id")
        let rootId = Expression<String>("root_id")
        let originalId = Expression<String>("original_id")
        let message = Expression<String>("message")
        let metadata = Expression<String>("metadata")
        let type = Expression<String>("type")
        let pendingPostId = Expression<String?>("pending_post_id")
        let prevPostId = Expression<String?>("previous_post_id")
        let props = Expression<String?>("props")
        let statusCol = Expression<String>("_status")
        
        var postsSetters: [PostSetters] = []
        
        for post in posts {
            var setter = [Setter]()
            let metadataSetters = createPostMetadataSetters(from: post)
            setter.append(id <- post.id)
            setter.append(createAt <- post.create_at)
            setter.append(updateAt <- post.update_at)
            setter.append(editAt <- post.edit_at)
            setter.append(deleteAt <- post.delete_at)
            setter.append(isPinned <- post.is_pinned)
            setter.append(userId <- post.user_id)
            setter.append(channelId <- post.channel_id)
            setter.append(rootId <- post.root_id)
            setter.append(originalId <- post.original_id)
            setter.append(message <- post.message)
            setter.append(metadata <- metadataSetters.metadata)
            setter.append(type <- post.type)
            setter.append(pendingPostId <- post.pending_post_id)
            setter.append(prevPostId <- post.prev_post_id)
            setter.append(props <- post.props)
            setter.append(statusCol <- "created")

            let postSetter = PostSetters(
                id: post.id,
                postSetters: setter,
                reactionSetters: metadataSetters.reactionSetters,
                fileSetters: metadataSetters.fileSetters,
                emojiSetters: metadataSetters.emojiSetters
            )
            postsSetters.append(postSetter)
        }
        
        return postsSetters
    }
    
    private func createPostMetadataSetters(from post: Post) -> MetadataSetters {
        let id = Expression<String>("id")
        let userId = Expression<String>("user_id")
        let postId = Expression<String>("post_id")
        let emojiName = Expression<String>("emoji_name")
        let createAt = Expression<Int64>("create_at")
        let name = Expression<String>("name")
        let ext = Expression<String>("extension")
        let size = Expression<Int64>("size")
        let mimeType = Expression<String>("mime_type")
        let width = Expression<Int64>("width")
        let height = Expression<Int64>("height")
        let localPath = Expression<String?>("local_path")
        let imageThumbnail = Expression<String?>("image_thumbnail")
        let statusCol = Expression<String>("_status")
        
        var metadataString = "{}"
        var reactionSetters = [[Setter]]()
        var fileSetters = [[Setter]]()
        var emojiSetters = [[Setter]]()
        
        let json = try? JSONSerialization.jsonObject(with: post.metadata.data(using: .utf8)!, options: [])
        if var metadata = json as? [String: Any] {
            // Reaction setters
            if let reactions = metadata["reactions"] as? [Any] {
                for reaction in reactions {
                    if let r = reaction as? [String: Any] {
                        var reactionSetter = [Setter]()
                        reactionSetter.append(id <- generateId())
                        reactionSetter.append(userId <- r["user_id"] as! String)
                        reactionSetter.append(postId <- r["post_id"] as! String)
                        reactionSetter.append(emojiName <- r["emoji_name"] as! String)
                        reactionSetter.append(createAt <- r["create_at"] as! Int64)
                        reactionSetter.append(statusCol <- "created")

                        reactionSetters.append(reactionSetter)
                    }
                }
                metadata.removeValue(forKey: "reactions")
            }

            // File setters
            if let files = metadata["files"] as? [Any] {
                for file in files {
                    if let f = file as? [String: Any] {
                        var fileSetter = [Setter]()
                        fileSetter.append(id <- f["id"] as! String)
                        fileSetter.append(postId <- f["post_id"] as! String)
                        fileSetter.append(name <- f["name"] as! String)
                        fileSetter.append(ext <- f["extension"] as! String)
                        fileSetter.append(size <- f["size"] as! Int64)
                        fileSetter.append(mimeType <- f["mime_type"] as! String)
                        fileSetter.append(width <- (f["width"] as? Int64 ?? 0))
                        fileSetter.append(height <- (f["height"] as? Int64 ?? 0))
                        fileSetter.append(localPath <- "")
                        fileSetter.append(imageThumbnail <- (f["mini_preview"] as? String ?? ""))
                        fileSetter.append(statusCol <- "created")

                        fileSetters.append(fileSetter)
                    }
                }
                
                metadata.removeValue(forKey: "files")
            }

            // Emoji setters
            if let emojis = metadata["emojis"] as? [Any] {
                for emoji in emojis {
                    if let e = emoji as? [String: Any] {
                        var emojiSetter = [Setter]()
                        emojiSetter.append(id <- e["id"] as! String)
                        emojiSetter.append(name <- e["name"] as! String)
                        emojiSetter.append(statusCol <- "created")

                        emojiSetters.append(emojiSetter)
                    }
                }
                
                metadata.removeValue(forKey: "emojis")
            }

            // Remaining Metadata
            
            let dataJSON = try! JSONSerialization.data(withJSONObject: metadata, options: [])
            metadataString = String(data: dataJSON, encoding: String.Encoding.utf8)!
        }

        return MetadataSetters(metadata: metadataString,
                               reactionSetters: reactionSetters,
                               fileSetters: fileSetters,
                               emojiSetters: emojiSetters)
    }
    
    private func createThreadSetters(_ db: Connection, from posts: [Post]) throws -> [ThreadSetters] {
        let id = Expression<String>("id")
        let lastReplyAt = Expression<Int64>("last_reply_at")
        let replyCount = Expression<Int>("reply_count")
        let isFollowing = Expression<Bool>("is_following")
        let statusCol = Expression<String>("_status")
        let lastFetchAtCol = Expression<Int64>("last_fetched_at")
        
        var threadsSetters: [ThreadSetters] = []
        
        for post in posts {
            
            let query = threadTable
                .select(id)
                .where(id == post.id)

            if let _ = try? db.pluck(query) {
                let updateQuery = threadTable
                    .where(id == post.id)
                    .update(lastReplyAt <- post.last_reply_at,
                            replyCount <- post.reply_count,
                            isFollowing <- post.is_following,
                            statusCol <- "updated"
                    )
                try db.run(updateQuery)
            } else {
                var setter = [Setter]()
                setter.append(id <- post.id)
                setter.append(lastReplyAt <- post.last_reply_at)
                setter.append(replyCount <- post.reply_count)
                setter.append(isFollowing <- post.is_following)
                setter.append(lastFetchAtCol <- 0)
                setter.append(statusCol <- "created")

                let threadSetter = ThreadSetters(
                    id: post.id,
                    threadSetters: setter,
                    threadParticipantSetters: createThreadParticipantSetters(from: post)
                )
                threadsSetters.append(threadSetter)
            }
        }
        
        return threadsSetters
    }
    
    private func createThreadParticipantSetters(from post: Post) -> [[Setter]] {
        
        var participantSetters = [[Setter]]()

        let id = Expression<String>("id")
        let userId = Expression<String>("user_id")
        let threadId = Expression<String>("thread_id")
        let statusCol = Expression<String>("_status")
        
        for p in post.participants ?? [] {
            var participantSetter = [Setter]()
            participantSetter.append(id <- generateId() as String)
            participantSetter.append(userId <- p.id)
            participantSetter.append(threadId <- post.id)
            participantSetter.append(statusCol <- "created")
            participantSetters.append(participantSetter)
        }
        
        return participantSetters
    }
    
    private func createPostsInThreadSetters(_ db: Connection, from posts: [Post]) throws -> [[Setter]] {
        var setters = [[Setter]]()
        var postsInThread = [String: [Post]]()
        
        for post in posts {
            if !post.root_id.isEmpty && post.delete_at == 0 {
                var threadPosts = postsInThread[post.root_id] ?? [Post]()
                threadPosts.append(post)
                
                postsInThread.updateValue(threadPosts, forKey: post.root_id)
            }
        }
        
        let rootIdCol = Expression<String>("root_id")
        let earliestCol = Expression<Int64>("earliest")
        let latestCol = Expression<Int64>("latest")
        let statusCol = Expression<String>("_status")
        
        for (rootId, posts) in postsInThread {
            let sortedPosts = posts.sorted(by: { $0.create_at < $1.create_at })
            let earliest = sortedPosts.first!.create_at
            let latest = sortedPosts.last!.create_at
            
            let query = postsInThreadTable
                .where(rootIdCol == rootId)
                .order(latestCol.desc)
                .limit(1)
            if let row = try? db.pluck(query) {
                let rowEarliest = try row.get(earliestCol)
                let rowLatest = try row.get(latestCol)
                
                let updateQuery = postsInThreadTable
                    .where(rootIdCol == rootId && earliestCol == rowEarliest && latestCol == rowLatest)
                    .update(earliestCol <- min(earliest, rowEarliest),
                            latestCol <- max(latest, rowLatest), statusCol <- "updated")
                try db.run(updateQuery)
            } else {
                var setter = [Setter]()
                setter.append(Expression<String>("id") <- generateId())
                setter.append(rootIdCol <- rootId)
                setter.append(earliestCol <- earliest)
                setter.append(latestCol <- latest)
                setter.append(statusCol <- "created")
                
                setters.append(setter)
            }
        }
        
        return setters
    }
}
