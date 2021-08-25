//
//  Database.swift
//  Gekidou
//
//  Created by Miguel Alatzar on 8/20/21.
//

import Foundation
import SQLite3
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
//    let parent_id: String
    let original_id: String
    let message: String
    let type: String
    let props: PostProps?
    let hashtag: String?
    let pending_post_id: String
    let reply_count: Int64
    let file_ids: [String]?
    let metadata: PostMetadata?
    let last_reply_at: Int64?
    let failed: Bool?
    let ownPost: Bool?
    let prev_post_id: String?
    let participants: [String]?
    
    //    let user_activity_posts?: Post[]
    //    let state: 'DELETED'
}

// TODO: This should be exposed to Objective-C in order to handle
// any Database throwable methods.
enum DatabaseError: Error {
    case OpenFailure(_ dbPath: String)
    case MultipleServers
    case NoResults(_ query: String)
    case NoDatabase(_ serverUrl: String)
    case InsertError(_ statement: String)
}

extension DatabaseError: LocalizedError {
    var errorDescription: String? {
        switch self {
        case .OpenFailure(dbPath: let dbPath):
            return "Error opening database: \(dbPath)"
        case .MultipleServers:
            return "Cannot determine server URL as there are multiple servers"
        case .NoResults(query: let query):
            return "No results for query: \(query)"
        case .NoDatabase(serverUrl: let serverUrl):
            return "No database for server: \(serverUrl)"
        case .InsertError(statement: let statement):
            return "Insert error: \(statement)"
        }
    }
}

public class Database: NSObject {
    internal let DEFAULT_DB_NAME = "app.db"
    internal var DEFAULT_DB_PATH: String
    internal var defaultDB: OpaquePointer? = nil
    internal var serversTable = Table("Servers")
    internal var postsInChannelTable = Table("PostsInChannel")
    internal var postTable = Table("Post")
    
    @objc public static let `default` = Database()
    
    override private init() {
        let appGroupId = Bundle.main.object(forInfoDictionaryKey: "AppGroupIdentifier") as! String
        let sharedDirectory = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupId)!
        let databaseUrl = sharedDirectory.appendingPathComponent("databases/\(DEFAULT_DB_NAME)")
        
        DEFAULT_DB_PATH = databaseUrl.path
    }
    
    @objc public func getOnlyServerUrlObjc() -> String {
        do {
            return try getOnlyServerUrl()
        } catch {
            print(error)
            return ""
        }
    }
    
    public func getOnlyServerUrl() throws -> String {
        let db = try Connection(DEFAULT_DB_PATH)
        let url = Expression<String>("url")
        let query = serversTable.select(url)
        
        var serverUrl: String?
        for result in try db.prepare(query) {
            if (serverUrl != nil) {
                throw DatabaseError.MultipleServers
            }
            
            serverUrl = try result.get(url)
        }
        
        if (serverUrl != nil) {
            return serverUrl!
        }
    
        throw DatabaseError.NoResults(query.asSQL())
    }
    
    public func queryPostsSinceAndCountForChannel(withId channelId: String, withServerUrl serverUrl: String) throws -> (since: Int64, count: Int) {
        let dbPath = try getDatabasePathForServer(serverUrl)!
        let db = try Connection(dbPath)
        
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
        
        var since: Int64 = 0
        if let result = try db.pluck(postQuery) {
            since = try result.get(createAtCol)
        }

        let count = try db.scalar(postQuery.count)
        
        return (since, count)
    }
    
    public func insertPosts(_ serverUrl: String, _ channelId: String, _ posts: [Post]) throws {
        let dbPath = try getDatabasePathForServer(serverUrl)!
        let db = try Connection(dbPath)
        let setters = createPostSetters(from: posts)

        try db.run(postTable.insertMany(setters))
    }
    
    private func getDatabasePathForServer(_ serverUrl: String) throws -> String? {
        let db = try Connection(DEFAULT_DB_PATH)
        let url = Expression<String>("url")
        let dbPath = Expression<String>("db_path")
        let query = serversTable.select(dbPath).where(url == serverUrl)
        
        for result in try db.prepare(query) {
            return try result.get(dbPath)
        }
        
        throw DatabaseError.NoResults(query.asSQL())
    }
    
    private func queryPostsInChannelEarliestAndLatest(_ serverUrl: String, _ channelId: String) throws -> (Int64, Int64) {
        let dbPath = try getDatabasePathForServer(serverUrl)!
        let db = try Connection(dbPath)
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
        let pendingPostId = Expression<String>("pending_post_id")
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
    
    private func json(from object:Any?) -> String? {
        guard let object = object, let data = try? JSONSerialization.data(withJSONObject: object, options: []) else {
            return nil
        }
        return String(data: data, encoding: String.Encoding.utf8)
    }
}
