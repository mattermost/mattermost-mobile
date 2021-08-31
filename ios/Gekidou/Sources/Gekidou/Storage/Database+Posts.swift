//
//  Database+Posts.swift
//  
//
//  Created by Miguel Alatzar on 8/26/21.
//

import Foundation
import SQLite

public struct EmbedMedia: Codable {
    let type: String?
    let url: String?
    let secure_url: String?
    let width: Int64?
    let height: Int64?
}

public struct EmbedData: Codable {
    let type: String?
    let url: String?
    let title: String?
    let description: String?
    let determiner: String?
    let site_name: String?
    let locale: String?
    let locales_alternate: String?
    let images: [EmbedMedia]?
    let audios: [EmbedMedia]?
    let videos: [EmbedMedia]?
}

public struct Embed: Codable {
    let type: String?
    let url: String?
    let data: EmbedData?
}

public struct Emoji: Codable {
    let id: String
    let name: String
}

public struct File: Codable {
    let id: String
    let post_id: String
    let name: String
    let `extension`: String
    let size: Int64
    let mime_type: String
    let width: Int64
    let height: Int64
    let local_path: String?
    let mini_preview: String?
}

public struct Reaction: Codable {
    let user_id: String
    let post_id: String
    let emoji_name: String
    let create_at: Int64
}

public struct Image: Codable {
    let width: Int64
    let height: Int64
    let format: String
    let frame_count: Int64
}

public struct PostMetadata: Codable {
    let embeds: [Embed]?
    let images: [String:Image]?
    var emojis: [Emoji]?
    var files: [File]?
    var reactions: [Reaction]?
}

public struct PostPropsAddChannelMember: Codable {
    let post_id: String
    let usernames: String
    let not_in_channel_usernames: String
    let user_ids: String
    let not_in_channel_user_ids: String
    let not_in_groups_usernames: String
    let not_in_groups_user_ids: String
}

public struct PostPropsAttachment: Codable {
    let id: Int64
    let fallback: String
    let color: String
    let pretext: String
    let author_name: String
    let author_link: String
    let author_icon: String
    let title: String
    let title_link: String
    let text: String
    let image_url: String
    let thumb_url: String
    let footer: String
    let footer_icon: String
    
    // TODO:
    // fields
    // timestamp
    // actions
}

public struct PostProps: Codable {
    let userId: String?
    let username: String?
    let addedUserId: String?
    let removedUserId: String?
    let removedUsername: String?
    let deleteBy: String?
    let old_header: String?
    let new_header: String?
    let old_purpose: String?
    let new_purpose: String?
    let old_displayname: String?
    let new_displayname: String?
    let mentionHighlightDisabled: Bool?
    let disable_group_highlight: Bool?
    let override_username: Bool?
    let from_webhook: Bool?
    let override_icon_url: Bool?
    let override_icon_emoji: Bool?
    let add_channel_member: PostPropsAddChannelMember?
    let attachments: [PostPropsAttachment]?
    
    // TODO:
    // appBindings
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
    var props: PostProps?
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

struct MetadataSetters {
    let postMetadataSetters: [[Setter]]
    let reactionSetters: [[Setter]]
    let fileSetters: [[Setter]]
    let emojiSetters: [[Setter]]
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
        try insertAndDeletePosts(postData.posts, channelId, serverUrl)
        try handlePostsInChannel(postData, channelId, serverUrl, usedSince)
        try handlePostMetadata(postData.posts, channelId, serverUrl)
        try handlePostsInThread(postData.posts, serverUrl)
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
    
    private func handlePostsInThread(_ posts: [Post], _ serverUrl: String) throws {
        let db = try getDatabaseForServer(serverUrl)
        
        let postsInThreadSetters = try createPostsInThreadSetters(from: posts, withServerUrl: serverUrl)
        if !postsInThreadSetters.isEmpty {
            let insertQuery = postsInThreadTable.insertMany(or: .replace, postsInThreadSetters)
            try db.run(insertQuery)
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
    
    private func insertAndDeletePosts(_ posts: [Post], _ channelId: String, _ serverUrl: String) throws {
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
    
    private func handlePostMetadata(_ posts: [Post], _ channelId: String, _ serverUrl: String) throws {
        let db = try getDatabaseForServer(serverUrl)

        let setters = createPostMetadataSetters(from: posts)
        
        if !setters.postMetadataSetters.isEmpty {
            let insertQuery = postMetadataTable.insertMany(or: .replace, setters.postMetadataSetters)
            try db.run(insertQuery)
        }
        
        if !setters.reactionSetters.isEmpty {
            let insertQuery = reactionTable.insertMany(or: .replace, setters.reactionSetters)
            try db.run(insertQuery)
        }
        
        if !setters.fileSetters.isEmpty {
            let insertQuery = fileTable.insertMany(or: .replace, setters.fileSetters)
            try db.run(insertQuery)
        }
        
        if !setters.emojiSetters.isEmpty {
            let insertQuery = emojiTable.insertMany(or: .replace, setters.emojiSetters)
            try db.run(insertQuery)
        }
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
        let props = Expression<String?>("props")
        
        var setters = [[Setter]]()
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

            if let postProps = post.props {
                let propsJSON = try! JSONEncoder().encode(postProps)
                let propsString = String(data: propsJSON, encoding: String.Encoding.utf8)
                setter.append(props <- propsString)
            }

            setters.append(setter)
        }
        
        return setters
    }
    
    private func createPostMetadataSetters(from posts: [Post]) -> MetadataSetters {
        let id = Expression<String>("id")
        let data = Expression<String>("data")
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
        
        var postMetadataSetters = [[Setter]]()
        var reactionSetters = [[Setter]]()
        var fileSetters = [[Setter]]()
        var emojiSetters = [[Setter]]()
        
        for post in posts {
            if var metadata = post.metadata {
                // Reaction setters
                if let reactions = metadata.reactions {
                    for reaction in reactions {
                        var reactionSetter = [Setter]()
                        reactionSetter.append(userId <- reaction.user_id)
                        reactionSetter.append(postId <- reaction.post_id)
                        reactionSetter.append(emojiName <- reaction.emoji_name)
                        reactionSetter.append(createAt <- reaction.create_at)
                        
                        reactionSetters.append(reactionSetter)
                    }
                    
                    metadata.reactions = nil
                }
                
                // File setters
                if let files = metadata.files {
                    for file in files {
                        var fileSetter = [Setter]()
                        fileSetter.append(id <- file.id)
                        fileSetter.append(postId <- file.post_id)
                        fileSetter.append(name <- file.name)
                        fileSetter.append(ext <- file.`extension`)
                        fileSetter.append(size <- file.size)
                        fileSetter.append(mimeType <- file.mime_type)
                        fileSetter.append(width <- file.width)
                        fileSetter.append(height <- file.height)
                        fileSetter.append(localPath <- file.local_path)
                        fileSetter.append(imageThumbnail <- file.mini_preview)
                        
                        fileSetters.append(fileSetter)
                    }
                    
                    metadata.files = nil
                }
                
                // Emoji setters
                if let emojis = metadata.emojis {
                    for emoji in emojis {
                        var emojiSetter = [Setter]()
                        emojiSetter.append(id <- emoji.id)
                        emojiSetter.append(name <- emoji.name)
                        
                        emojiSetters.append(emojiSetter)
                    }
                    
                    metadata.emojis = nil
                }
                
                // Metadata setter
                var metadataSetter = [Setter]()
                
                metadataSetter.append(id <- post.id)
                
                let dataJSON = try! JSONEncoder().encode(metadata)
                let dataString = String(data: dataJSON, encoding: String.Encoding.utf8)!
                metadataSetter.append(data <- dataString)
                
                postMetadataSetters.append(metadataSetter)
            }
        }

        return MetadataSetters(postMetadataSetters: postMetadataSetters,
                               reactionSetters: reactionSetters,
                               fileSetters: fileSetters,
                               emojiSetters: emojiSetters)
    }
    
    private func createPostsInThreadSetters(from posts: [Post], withServerUrl serverUrl: String) throws -> [[Setter]] {
        let db = try getDatabaseForServer(serverUrl)
        
        var setters = [[Setter]]()
        var postsInThread = [String: [Post]]()
        
        for post in posts {
            if !post.root_id.isEmpty {
                var threadPosts = postsInThread[post.root_id] ?? [Post]()
                threadPosts.append(post)
                
                postsInThread.updateValue(threadPosts, forKey: post.root_id)
            }
        }
        
        let rootIdCol = Expression<String>("root_id")
        let earliestCol = Expression<Int64>("earliest")
        let latestCol = Expression<Int64>("latest")
        
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
                            latestCol <- max(latest, rowLatest))
                try db.run(updateQuery)
            } else {
                var setter = [Setter]()
                setter.append(rootIdCol <- rootId)
                setter.append(earliestCol <- earliest)
                setter.append(latestCol <- latest)
                
                setters.append(setter)
            }
        }
        
        return setters
    }
}
