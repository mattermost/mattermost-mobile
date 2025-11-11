//
//  Database+Posts.swift
//  
//
//  Created by Miguel Alatzar on 8/26/21.
//

import Foundation
import SQLite

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
    public func queryLastPostInThread(withRootId rootId: String, forServerUrl serverUrl: String) -> Double? {
        if let db = try? getDatabaseForServer(serverUrl) {
            let createAtCol = Expression<Double>("create_at")
            let rootIdCol = Expression<String>("root_id")
            let query = postTable
                .select(createAtCol)
                .where(rootIdCol == rootId)
                .order(createAtCol.desc)
                .limit(1)
            if let result = try? db.pluck(query) {
                return try? result.get(createAtCol)
            }
        }
        return nil
    }
    
    public func queryLastPostCreateAt(withId channelId: String, forServerUrl serverUrl: String) -> Double? {
        if let db = try? getDatabaseForServer(serverUrl) {
            let earliestCol = Expression<Double>("earliest")
            let latestCol = Expression<Double>("latest")
            let channelIdCol = Expression<String>("channel_id")
            let earliestLatestQuery = postsInChannelTable
                .select(earliestCol, latestCol)
                .where(channelIdCol == channelId)
                .order(latestCol.desc)
                .limit(1)
            
            var earliest: Double?
            var latest: Double?
            if let result = try? db.pluck(earliestLatestQuery) {
                earliest = try? result.get(earliestCol)
                latest = try? result.get(latestCol)
            } else {
                return nil
            }
            
            let createAtCol = Expression<Double>("create_at")
            let deleteAtCol = Expression<Double>("delete_at")
            var postQuery = postTable
                .select(createAtCol)
                .where(channelIdCol == channelId && deleteAtCol == 0)
            
            if let earliest = earliest, let latest = latest {
                postQuery = postQuery.filter(earliest...latest ~= createAtCol)
            }
            postQuery = postQuery.order(createAtCol.desc).limit(1)
            
            if let result = try? db.pluck(postQuery) {
                return try? result.get(createAtCol)
            }
        }
        
        return nil
    }
    
    public func queryPostsSinceForChannel(withId channelId: String, forServerUrl serverUrl: String) -> Double? {
        if let db = try? getDatabaseForServer(serverUrl) {
            let idCol = Expression<String>("id")
            let lastFetchedAtColAsDouble = Expression<Double?>("last_fetched_at")
            let query = myChannelTable.where(idCol == channelId)
            
            if let result = try? db.pluck(query) {
                if let last = result[lastFetchedAtColAsDouble],
                   last > 0 {
                    return last
                }
            }
            
            return queryLastPostCreateAt(withId: channelId, forServerUrl: serverUrl)
        }
        
        return nil
    }
    
    public func handlePostData(_ db: Connection, _ postData: PostResponse, _ channelId: String, _ receivingThreads: Bool = false) throws {
        let sortedChainedPosts = chainAndSortPosts(postData)
        try insertOrUpdatePosts(db, sortedChainedPosts, channelId)
        let sortedAndNotDeletedPosts = sortedChainedPosts.filter({$0.deleteAt == 0})

        if (!receivingThreads) {
            if let first = sortedAndNotDeletedPosts.first,
               let last = sortedAndNotDeletedPosts.last {
                let earliest = first.createAt
                let latest = last.createAt
                try handlePostsInChannel(db, channelId, earliest, latest)
            }
        }
        try handlePostsInThread(db, Array(postData.posts.values))
    }
    
    private func handlePostsInChannel(_ db: Connection, _ channelId: String, _ earliest: Double, _ latest: Double) throws {
        let updated = try updatePostsInChannelEarliestAndLatest(db, channelId, earliest, latest)
        if (!updated) {
            try insertPostsInChannel(db, channelId, earliest, latest)
        }
    }
    
    private func handlePostsInThread(_ db: Connection, _ posts: [Post]) throws {
        let postsInThreadSetters = try createPostsInThreadSetters(db, from: posts)
        if !postsInThreadSetters.isEmpty {
            let insertQuery = postsInThreadTable.insertMany(or: .replace, postsInThreadSetters)
            try db.run(insertQuery)
        }
    }
    
    private func chainAndSortPosts(_ postData: PostResponse) -> [Post] {
        let order = postData.order
        let posts = Array(postData.posts.values)
        var prevPostId = ""
        
        return posts.sorted(by: {$0.createAt < $1.createAt}).enumerated().map { (index, post) in
            var modified = post
            if (index == 0) {
                modified.prevPostId = postData.prevPostId
            } else {
                modified.prevPostId = prevPostId
            }
            
            if (order.contains(post.id)) {
                prevPostId = post.id
            }
            
            return modified
        }
    }
    
    private func updatePostsInChannelEarliestAndLatest(_ db: Connection, _ channelId: String, _ earliest: Double, _ latest: Double) throws -> Bool {
        let idCol = Expression<String>("id")
        let channelIdCol = Expression<String>("channel_id")
        let earliestCol = Expression<Double>("earliest")
        let latestCol = Expression<Double>("latest")
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
    
    private func insertPostsInChannel(_ db: Connection, _ channelId: String, _ earliest: Double, _ latest: Double) throws {
        let idCol = Expression<String>("id")
        let channelIdCol = Expression<String>("channel_id")
        let earliestCol = Expression<Double>("earliest")
        let latestCol = Expression<Double>("latest")
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
    
    private func createPostSetters(from posts: [Post]) -> [PostSetters] {
        let id = Expression<String>("id")
        let createAt = Expression<Double>("create_at")
        let updateAt = Expression<Double>("update_at")
        let editAt = Expression<Double>("edit_at")
        let deleteAt = Expression<Double>("delete_at")
        let isPinned = Expression<Bool>("is_pinned")
        let userId = Expression<String>("user_id")
        let channelId = Expression<String>("channel_id")
        let rootId = Expression<String>("root_id")
        let originalId = Expression<String>("original_id")
        let message = Expression<String>("message")
        let messageSource = Expression<String>("message_source")
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
            let propsJSON = try? JSONSerialization.data(withJSONObject: post.props, options: [])
            var propsString = "{}"
            if let propsJSON = propsJSON {
                propsString = String(data: propsJSON, encoding: String.Encoding.utf8) ?? "{}"
            }

            setter.append(id <- post.id)
            setter.append(createAt <- post.createAt)
            setter.append(updateAt <- post.updateAt)
            setter.append(editAt <- post.editAt)
            setter.append(deleteAt <- post.deleteAt)
            setter.append(isPinned <- post.isPinned)
            setter.append(userId <- post.userId)
            setter.append(channelId <- post.channelId)
            setter.append(rootId <- post.rootId)
            setter.append(originalId <- post.originalId)
            setter.append(message <- post.message)
            setter.append(messageSource <- post.messageSource)
            setter.append(metadata <- metadataSetters.metadata)
            setter.append(type <- post.type)
            setter.append(pendingPostId <- post.pendingPostId)
            setter.append(prevPostId <- post.prevPostId)
            setter.append(props <- propsString)
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

    private func createReactionSetters(from reactions: [Any], postId: String) -> [[Setter]] {
        let id = Expression<String>("id")
        let userId = Expression<String>("user_id")
        let postIdCol = Expression<String>("post_id")
        let emojiName = Expression<String>("emoji_name")
        let createAt = Expression<Double>("create_at")
        let statusCol = Expression<String>("_status")

        var reactionSetters = [[Setter]]()
        for reaction in reactions {
            if let r = reaction as? [String: Any],
               let userIdValue = r["user_id"] as? String,
               let postIdValue = r["post_id"] as? String,
               let emojiNameValue = r["emoji_name"] as? String,
               let createAtValue = r["create_at"] as? Double {
                var reactionSetter = [Setter]()
                reactionSetter.append(id <- generateId())
                reactionSetter.append(userId <- userIdValue)
                reactionSetter.append(postIdCol <- postIdValue)
                reactionSetter.append(emojiName <- emojiNameValue)
                reactionSetter.append(createAt <- createAtValue)
                reactionSetter.append(statusCol <- "created")
                reactionSetters.append(reactionSetter)
            } else {
                GekidouLogger.shared.log(.warning, "Gekidou Database: Skipping malformed reaction in post %{public}@", postId)
            }
        }
        return reactionSetters
    }

    private func createFileSetters(from files: [Any], postId: String) -> [[Setter]] {
        let id = Expression<String>("id")
        let postIdCol = Expression<String>("post_id")
        let name = Expression<String>("name")
        let ext = Expression<String>("extension")
        let size = Expression<Double>("size")
        let mimeType = Expression<String>("mime_type")
        let width = Expression<Double>("width")
        let height = Expression<Double>("height")
        let localPath = Expression<String?>("local_path")
        let imageThumbnail = Expression<String?>("image_thumbnail")
        let statusCol = Expression<String>("_status")

        var fileSetters = [[Setter]]()
        for file in files {
            if let f = file as? [String: Any],
               let idValue = f["id"] as? String,
               let postIdValue = f["post_id"] as? String,
               let nameValue = f["name"] as? String,
               let extValue = f["extension"] as? String,
               let sizeValue = f["size"] as? Double,
               let mimeTypeValue = f["mime_type"] as? String {
                var fileSetter = [Setter]()
                fileSetter.append(id <- idValue)
                fileSetter.append(postIdCol <- postIdValue)
                fileSetter.append(name <- nameValue)
                fileSetter.append(ext <- extValue)
                fileSetter.append(size <- sizeValue)
                fileSetter.append(mimeType <- mimeTypeValue)
                fileSetter.append(width <- (f["width"] as? Double ?? 0))
                fileSetter.append(height <- (f["height"] as? Double ?? 0))
                fileSetter.append(localPath <- "")
                fileSetter.append(imageThumbnail <- (f["mini_preview"] as? String ?? ""))
                fileSetter.append(statusCol <- "created")
                fileSetters.append(fileSetter)
            } else {
                GekidouLogger.shared.log(.warning, "Gekidou Database: Skipping malformed file in post %{public}@", postId)
            }
        }
        return fileSetters
    }

    private func createEmojiSetters(from emojis: [Any], postId: String) -> [[Setter]] {
        let id = Expression<String>("id")
        let name = Expression<String>("name")
        let statusCol = Expression<String>("_status")

        var emojiSetters = [[Setter]]()
        for emoji in emojis {
            if let e = emoji as? [String: Any],
               let idValue = e["id"] as? String,
               let nameValue = e["name"] as? String {
                var emojiSetter = [Setter]()
                emojiSetter.append(id <- idValue)
                emojiSetter.append(name <- nameValue)
                emojiSetter.append(statusCol <- "created")
                emojiSetters.append(emojiSetter)
            } else {
                GekidouLogger.shared.log(.warning, "Gekidou Database: Skipping malformed emoji in post %{public}@", postId)
            }
        }
        return emojiSetters
    }

    private func createPostMetadataSetters(from post: Post) -> MetadataSetters {
        var metadataString = "{}"
        var reactionSetters = [[Setter]]()
        var fileSetters = [[Setter]]()
        var emojiSetters = [[Setter]]()

        guard let metadataData = post.metadata.data(using: .utf8) else {
            GekidouLogger.shared.log(.error, "Gekidou Database: Failed to encode post metadata as UTF-8 for post %{public}@", post.id)
            return MetadataSetters(metadata: metadataString, reactionSetters: reactionSetters, fileSetters: fileSetters, emojiSetters: emojiSetters)
        }

        do {
            guard let json = try JSONSerialization.jsonObject(with: metadataData, options: []) as? [String: Any] else {
                GekidouLogger.shared.log(.error, "Gekidou Database: Failed to decode post metadata JSON as dictionary for post %{public}@", post.id)
                return MetadataSetters(metadata: metadataString, reactionSetters: reactionSetters, fileSetters: fileSetters, emojiSetters: emojiSetters)
            }

            var metadata = json

            // Process reactions
            if let reactions = metadata["reactions"] as? [Any] {
                reactionSetters = createReactionSetters(from: reactions, postId: post.id)
                metadata.removeValue(forKey: "reactions")
            }

            // Process files
            if let files = metadata["files"] as? [Any] {
                fileSetters = createFileSetters(from: files, postId: post.id)
                metadata.removeValue(forKey: "files")
            }

            // Process emojis
            if let emojis = metadata["emojis"] as? [Any] {
                emojiSetters = createEmojiSetters(from: emojis, postId: post.id)
                metadata.removeValue(forKey: "emojis")
            }

            // Serialize remaining metadata
            do {
                let dataJSON = try JSONSerialization.data(withJSONObject: metadata, options: [])
                if let metadataStringValue = String(data: dataJSON, encoding: String.Encoding.utf8) {
                    metadataString = metadataStringValue
                } else {
                    GekidouLogger.shared.log(.error, "Gekidou Database: Failed to encode remaining metadata as UTF-8 string for post %{public}@", post.id)
                }
            } catch {
                GekidouLogger.shared.log(.error, "Gekidou Database: Failed to serialize remaining metadata to JSON for post %{public}@ - %{public}@", post.id, String(describing: error))
            }
        } catch {
            GekidouLogger.shared.log(.error, "Gekidou Database: Failed to parse post metadata JSON for post %{public}@ - %{public}@", post.id, String(describing: error))
        }

        return MetadataSetters(metadata: metadataString, reactionSetters: reactionSetters, fileSetters: fileSetters, emojiSetters: emojiSetters)
    }
    
    private func createPostsInThreadSetters(_ db: Connection, from posts: [Post]) throws -> [[Setter]] {
        var setters = [[Setter]]()
        var postsInThread = [String: [Post]]()
        
        for post in posts {
            if !post.rootId.isEmpty && post.deleteAt == 0 {
                var threadPosts = postsInThread[post.rootId] ?? [Post]()
                threadPosts.append(post)
                
                postsInThread.updateValue(threadPosts, forKey: post.rootId)
            }
        }
        
        let rootIdCol = Expression<String>("root_id")
        let earliestCol = Expression<Double>("earliest")
        let latestCol = Expression<Double>("latest")
        let statusCol = Expression<String>("_status")
        
        for (rootId, posts) in postsInThread {
            let sortedPosts = posts.sorted(by: { $0.createAt < $1.createAt })
            if let earliest = sortedPosts.first?.createAt,
               let latest = sortedPosts.last?.createAt {
                
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
        }
        
        return setters
    }
}
