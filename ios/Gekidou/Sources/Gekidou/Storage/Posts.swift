//
//  File.swift
//  
//
//  Created by Miguel Alatzar on 8/26/21.
//

import Foundation
import SQLite

public struct Embed: Codable {
    // TODO
}

public struct Emoji: Codable {
    // TODO
}

public struct File: Codable {
    // TODO
}

public struct Reaction: Codable {
    // TODO
}

public struct Images: Codable {
    // TODO
}

public struct PostMetadata: Codable {
    let embeds: [Embed]?
    let emojis: [Emoji]?
    let files: [File]?
    let reactions: [Reaction]?
    let images: Images?
}

public struct PostProps: Codable {
    // TODO
}

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
    let props: PostProps?
    let hashtag: String?
    let pending_post_id: String?
    let reply_count: Int64
    let file_ids: [String]?
    let metadata: PostMetadata?
    let last_reply_at: Int64?
    let failed: Bool?
    let ownPost: Bool?
    let participants: [String]?
    var prev_post_id: String?
}

extension Database {
    public func queryPostsSinceForChannel(withId channelId: String, withServerUrl serverUrl: String) throws -> Int64? {
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
        if let result = try db.pluck(earliestLatestQuery) {
            earliest = try result.get(earliestCol)
            latest = try result.get(latestCol)
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
    
    private func queryPostsInChannelEarliestAndLatest(_ serverUrl: String, _ channelId: String) throws -> (Int64, Int64) {
        let db = try getDatabaseForServer(serverUrl)
        let earliest = Expression<Int64>("earliest")
        let latest = Expression<Int64>("latest")
        let id = Expression<String>("channel_id")
        let query = postsInChannelTable
            .select(earliest, latest)
            .where(id == channelId)
            .order(latest.desc)
            .limit(1)
        

        for result in try db.prepare(query) {
            return (try result.get(earliest),
                    try result.get(latest))
        }
        
        return (0, 0)
    }
    
    public func handlePostData(_ postData: PostData, _ channelId: String, _ serverUrl: String, _ usedSince: Bool = false) throws {
        try handlePosts(postData, channelId, serverUrl)
        try handlePostsInChannel(postData, channelId, serverUrl, usedSince)
        // handlePostsInThread
        // handlePostReactions
        // handlePostFiles
        // handlePostMetadata
        // handlePostEmojis
    }
    
    private func handlePosts(_ postData: PostData, _ channelId: String, _ serverUrl: String) throws {
        try insertAndDeletePosts(postData.posts, channelId, serverUrl)
    }
    
    private func handlePostsInChannel(_ postData: PostData, _ channelId: String, _ serverUrl: String, _ usedSince: Bool = false) throws {
        let sortedChainedPosts = chainAndSortPosts(postData)
        let earliest = sortedChainedPosts.first!.create_at
        let latest = sortedChainedPosts.last!.create_at
        
        if usedSince {
            try updatePostsInChannelLatestOnly(latest, channelId, serverUrl)
        } else {
            let updated = try updatePostsInChannelEarliestAndLatest(earliest, latest, channelId, serverUrl)
            if (!updated) {
                try insertPostsInChannel(earliest, latest, channelId, serverUrl)
            }
        }
    }
    
    private func chainAndSortPosts(_ postData: PostData) -> [Post] {
        let order = postData.order
        let prevPostId = postData.prev_post_id
        let posts = postData.posts

        return order.enumerated().reduce([Post]()) { (chainedPosts: [Post], current) in
            let index = current.0
            let postId = current.1
            
            var post = posts.first(where: {$0.id == postId})!
            post.prev_post_id = index == order.count - 1 ?
                prevPostId :
                order[index + 1]
                
            return chainedPosts + [post]
        }.sorted(by: { $0.create_at < $1.create_at })
    }
    
    private func updatePostsInChannelLatestOnly(_ latest: Int64, _ channelId: String, _ serverUrl: String) throws {
        let db = try getDatabaseForServer(serverUrl)
        
        let channelIdCol = Expression<String>("channel_id")
        let latestCol = Expression<Int64>("latest")
        
        let query = postsInChannelTable
            .where(channelIdCol == channelId)
            .order(latestCol.desc)
            .limit(1)
            .update(latestCol <- latest)
        
        try db.run(query)
    }
    
    private func updatePostsInChannelEarliestAndLatest(_ earliest: Int64, _ latest: Int64, _ channelId: String, _ serverUrl: String) throws -> Bool {
        let db = try getDatabaseForServer(serverUrl)
        
        let idCol = Expression<String>("id")
        let channelIdCol = Expression<String>("channel_id")
        let earliestCol = Expression<Int64>("earliest")
        let latestCol = Expression<Int64>("latest")
        
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
                .update(earliestCol <- min(earliest, recordEarliest), latestCol <- max(latest, recordLatest))
            
            try db.run(updateQuery)
            
            return true
        }
        
        return false
    }
    
    private func insertPostsInChannel(_ earliest: Int64, _ latest: Int64, _ channelId: String, _ serverUrl: String) throws {
        let db = try getDatabaseForServer(serverUrl)
        
        let rowIdCol = Expression<Int64>("rowid")
        let channelIdCol = Expression<String>("channel_id")
        let earliestCol = Expression<Int64>("earliest")
        let latestCol = Expression<Int64>("latest")
        
        let query = postsInChannelTable
            .insert(channelIdCol <- channelId, earliestCol <- earliest, latestCol <- latest)
        let newRecordId = try db.run(query)
        
        let deleteQuery = postsInChannelTable
            .where(rowIdCol != newRecordId &&
                    channelIdCol == channelId &&
                    earliestCol >= earliest &&
                    latestCol <= latest)
            .delete()
        
        try db.run(deleteQuery)
    }
    
    private func insertAndDeletePosts(_ posts: [Post], _ serverUrl: String, _ channelId: String) throws {
        let db = try getDatabaseForServer(serverUrl)
        
        let setters = createPostSetters(from: posts)
        let insertQuery = postTable.insertMany(or: .replace, setters)
        try db.run(insertQuery)
        
        let deleteIds = posts.reduce([String]()) { (accumulated, post) in
            if let deleteId = post.pending_post_id {
                return accumulated + [deleteId]
            }
            
            return accumulated
        }
        let id = Expression<String>("id")
        let deleteQuery = postTable
            .filter(deleteIds.contains(id))
            .delete()
        try db.run(deleteQuery)
    }
    
    private func createPostSetters(from posts: [Post]) -> [[Setter]] {
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
        let type = Expression<String>("type")
//        let hashtag = Expression<String?>("hashtag")
        let pendingPostId = Expression<String?>("pending_post_id")
//        let replyCount = Expression<Int64>("reply_count")
//        let fileIds = Expression<String?>("file_ids")
//        let lastReplyAt = Expression<Int64?>("last_reply_at")
//        let failed = Expression<Bool?>("failed")
//        let ownPost = Expression<Bool?>("ownPost")
        let prevPostId = Expression<String?>("previous_post_id")
//        let participants = Expression<String?>("participants")
        
        var setters: [[Setter]] = []
        for post in posts {
            var setter = [Setter]()
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
            setter.append(type <- post.type)
//            setter.append(hashtag <- post.hashtag)
            setter.append(pendingPostId <- post.pending_post_id)
//            setter.append(replyCount <- post.reply_count)
//            setter.append(fileIds <- json(from: post.file_ids))
//            setter.append(lastReplyAt <- post.last_reply_at)
//            setter.append(failed <- post.failed)
//            setter.append(ownPost <- post.ownPost)
            setter.append(prevPostId <- post.prev_post_id)
//            setter.append(participants <- json(from: post.participants))

            // TODO: props and metadata

            setters.append(setter)
        }
        
        return setters
    }
}
