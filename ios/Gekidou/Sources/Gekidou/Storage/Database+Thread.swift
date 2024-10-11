import Foundation
import SQLite

extension Database {
    public func hasThread(_ db: Connection, threadId: String) -> Bool {
        let idCol = Expression<String>("id")
        let query = threadTable.where(idCol == threadId)
        if let _ = try? db.pluck(query) {
            return true
        }
        
        return false
    }
    
    public func getTeamThreadSync(_ db: Connection, teamId: String) -> Row? {
        let idCol = Expression<String>("id")
        let query = teamThreadsSyncTable.where(idCol == teamId)
        return try? db.pluck(query)
    }
    
    public func handleThreads(_ db: Connection, _ threads: [PostThread], forTeamId teamId: String) throws {
        var teamIds = [String]()
        if teamId.isEmpty {
            let idCol = Expression<String>("id")
            if let myTeams = try? db.prepare(myTeamTable.select(idCol)) {
                if let ids = try? myTeams.map({ try $0.get(idCol) }) {
                    teamIds.append(contentsOf: ids)
                }
            }
        } else {
            teamIds.append(teamId)
        }
        
        for thread in threads {
            handleThread(db, thread, forTeamIds: teamIds)
        }
        
        handleTeamThreadSync(db, threads, forTeamIds: teamIds)
    }
    
    public func handleThread(_ db: Connection, _ thread: PostThread, forTeamIds teamIds: [String]) {
        if hasThread(db, threadId: thread.id) {
            try? updateThread(db, thread)
        } else {
            try? insertThread(db, thread)
        }
        
        try? syncParticipants(db, thread)
        
        if thread.isFollowing {
            for teamId in teamIds {
                try? handleThreadInTeam(db, thread, forTeamId: teamId)
            }
        }
    }
    
    private func insertThread(_ db: Connection, _ thread: PostThread) throws {
        let id = Expression<String>("id")
        let isFollowing = Expression<Bool>("is_following")
        let lastViewedAt = Expression<Double>("last_viewed_at")
        let lastReplyAt = Expression<Double>("last_reply_at")
        let unreadReplies = Expression<Int>("unread_replies")
        let unreadMentions = Expression<Int>("unread_mentions")
        let replyCount = Expression<Int>("reply_count")
        
        let setter: [Setter] = [
            id <- thread.id,
            isFollowing <- thread.isFollowing,
            lastViewedAt <- thread.lastViewedAt,
            lastReplyAt <- thread.lastReplyAt,
            unreadReplies <- thread.unreadReplies,
            unreadMentions <- thread.unreadMentions,
            replyCount <- thread.replyCount
        ]
        
        let _ = try db.run(threadTable.insert(or: .replace, setter))
    }
    
    private func updateThread(_ db: Connection, _ thread: PostThread) throws {
        let id = Expression<String>("id")
        let isFollowing = Expression<Bool>("is_following")
        let lastViewedAt = Expression<Double>("last_viewed_at")
        let lastReplyAt = Expression<Double>("last_reply_at")
        let unreadReplies = Expression<Int>("unread_replies")
        let unreadMentions = Expression<Int>("unread_mentions")
        let replyCount = Expression<Int>("reply_count")
        
        let setter: [Setter] = [
            isFollowing <- thread.isFollowing,
            lastViewedAt <- thread.lastViewedAt,
            lastReplyAt <- thread.lastReplyAt,
            unreadReplies <- thread.unreadReplies,
            unreadMentions <- thread.unreadMentions,
            replyCount <- thread.replyCount
        ]
        
        let _ = try db.run(threadTable.where(id == thread.id).update(setter))
    }
    
    private func syncParticipants(_ db: Connection, _ thread: PostThread) throws {
        let threadIdCol = Expression<String>("thread_id")
        let deletePreviousThreadParticipants = threadParticipantTable.where(threadIdCol == thread.id).delete()
        try db.run(deletePreviousThreadParticipants)
        
        let setters = createThreadParticipantSetters(from: thread)
        if !setters.isEmpty {
            try db.run(threadParticipantTable.insertMany(setters))
        }
    }
    
    private func handleThreadInTeam(_ db: Connection, _ thread: PostThread, forTeamId teamId: String) throws {
        let idCol = Expression<String>("id")
        let threadIdCol = Expression<String>("thread_id")
        let teamIdCol = Expression<String>("team_id")
        let existing = try? db.pluck(threadsInTeamTable.where(threadIdCol == thread.id && teamIdCol == teamId))
        if existing == nil {
            let setter: [Setter] = [
                idCol <- generateId(),
                threadIdCol <- thread.id,
                teamIdCol <- teamId,
            ]
            let _ = try db.run(threadsInTeamTable.insert(or: .replace, setter))
        }
    }
    
    private func handleTeamThreadSync(_ db: Connection, _ threads: [PostThread], forTeamIds teamIds: [String]) {
        let sortedList = threads.filter({ $0.isFollowing }).sorted(by: { $0.lastReplyAt < $1.lastReplyAt}).map{ $0.lastReplyAt }
        if let earliest = sortedList.first,
           let latest = sortedList.last {
            for teamId in teamIds {
                if let existing = getTeamThreadSync(db, teamId: teamId) {
                    try? updateTeamThreadSync(db, forTeamId: teamId, starting: earliest, ending: latest, currentRow: existing)
                } else {
                    try? insertTeamThreadSync(db, forTeamId: teamId, starting: earliest, ending: latest)
                }
            }
        }
    }
    
    private func insertTeamThreadSync(_ db: Connection, forTeamId teamId: String, starting earliest: Double, ending latest: Double) throws {
        let idCol = Expression<String>("id")
        let earliestCol = Expression<Double>("earliest")
        let latestCol = Expression<Double>("latest")
        
        let setter: [Setter] = [
            idCol <- teamId,
            earliestCol <- earliest,
            latestCol <- latest,
        ]
        
        let _ = try db.run(teamThreadsSyncTable.insert(or: .replace, setter))
    }
    
    private func updateTeamThreadSync(_ db: Connection, forTeamId teamId: String, starting earliest: Double, ending latest: Double, currentRow existing: Row) throws {
        let idCol = Expression<String>("id")
        let earliestCol = Expression<Double>("earliest")
        let latestCol = Expression<Double>("latest")

        let existingEarliest = (try? existing.get(earliestCol)) ?? 0
        let storeEarliest = min(earliest, existingEarliest)
        
        let existingLatest = (try? existing.get(latestCol)) ?? 0
        let storeLatest = max(latest, existingLatest)
        
        let _ = try db.run(
            teamThreadsSyncTable.where(idCol == teamId)
                .update(earliestCol <- storeEarliest, latestCol <- storeLatest)
        )
    }
    
    private func createThreadParticipantSetters(from thread: PostThread) -> [[Setter]] {
        var participantSetters = [[Setter]]()

        let id = Expression<String>("id")
        let userId = Expression<String>("user_id")
        let threadId = Expression<String>("thread_id")
        
        for p in thread.participants {
            var participantSetter = [Setter]()
            participantSetter.append(id <- generateId() as String)
            participantSetter.append(userId <- p.id)
            participantSetter.append(threadId <- thread.id)
            participantSetters.append(participantSetter)
        }
        
        return participantSetters
    }
}
