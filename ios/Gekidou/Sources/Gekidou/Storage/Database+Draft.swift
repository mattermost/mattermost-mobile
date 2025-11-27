import Foundation
import SQLite

extension Database {
    public func insertDraft(_ db: Connection, _ draft: Draft) throws {
        try? db.transaction {
            let idCol = Expression<String>("id")
            let channelIdCol = Expression<String>("channel_id")
            let rootIdCol = Expression<String>("root_id")
            let messageCol = Expression<String>("message")
            let filesCol = Expression<String>("files")
            let metadataCol = Expression<String>("metadata")
            let updateAtCol = Expression<Double>("update_at")
            let statusCol = Expression<String>("_status")
            
            let filesJSON: String
            if let data = try? JSONSerialization.data(withJSONObject: draft.files, options: []),
               let jsonString = String(data: data, encoding: .utf8) {
                filesJSON = jsonString
            } else {
                filesJSON = "[]"
            }
            
            let setters: [Setter] = [
                idCol <- draft.id,
                channelIdCol <- draft.channelId,
                rootIdCol <- draft.rootId,
                messageCol <- draft.message,
                filesCol <- filesJSON,
                metadataCol <- draft.metadata,
                updateAtCol <- draft.updateAt,
                statusCol <- "created"
            ]

            let insertQuery = draftTable.insert(or: .replace, setters)
            try db.run(insertQuery)
        }
    }

    public func insertDraft(_ draft: Draft, serverUrl: String) throws {
        if let db = try? getDatabaseForServer(serverUrl) {
            try insertDraft(db, draft)
        }
    }

    public func getDraft(db: Connection, channelId: String, rootId: String) throws -> Draft? {
        let channelIdCol = Expression<String>("channel_id")
        let rootIdCol = Expression<String>("root_id")

        let query = draftTable
            .filter(channelIdCol == channelId && rootIdCol == rootId)
            .limit(1)

        if let result = try? db.pluck(query) {
            let id = result[Expression<String>("id")]
            let channelId = result[channelIdCol]
            let rootId = result[rootIdCol]
            let message = result[Expression<String>("message")]
            let fileJSON = result[Expression<String>("files")]
            let metadata = result[Expression<String>("metadata")]
            let updateAt = result[Expression<Double>("update_at")]

            var files: [[String: Any]] = []
            if let data = fileJSON.data(using: .utf8),
               let parsed = try? JSONSerialization.jsonObject(with: data, options: []) as? [[String: Any]] {
                files = parsed
            }

            return Draft(
                id: id,
                channelId: channelId,
                rootId: rootId,
                message: message,
                files: files,
                metadata: metadata,
                updateAt: updateAt
            )
        }
        return nil
    }

    public func getDraft(serverUrl: String, channelId: String, rootId: String) throws -> Draft? {
        if let db = try? getDatabaseForServer(serverUrl) {
            return try getDraft(db: db, channelId: channelId, rootId: rootId)
        }
        return nil
    }
}
