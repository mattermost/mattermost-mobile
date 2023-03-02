import Foundation

public typealias ThreadResponse = (_ threads: PostThread?) -> Void

extension Network {
    public func fetchThread(byId threadId: String, belongingToTeamId teamId: String, forServerUrl serverUrl: String, completionHandler: @escaping ThreadResponse) {
        var thread: PostThread? = nil
        guard let currentUserId = try? Database.default.queryCurrentUserId(serverUrl),
            let threadTeamId = teamId.isEmpty ? Database.default.queryCurrentTeamId(serverUrl) : teamId
        else {
            completionHandler(nil)
            return
        }
        let url = buildApiUrl(serverUrl, "/users/\(currentUserId)/teams/\(threadTeamId)/threads/\(threadId)")
        request(url, usingMethod: "GET", forServerUrl: serverUrl) {data, response, error in
            if let data = data {
                thread = try? JSONDecoder().decode(PostThread.self, from: data)
            }
            completionHandler(thread)
        }
    }
}
