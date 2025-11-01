import Foundation

extension Network {
    public func fetchTeamIfNeeded(withId teamId: String, forServerUrl serverUrl: String, completionHandler: @escaping ((_ team: Team?, _ myTeam: TeamMember?) -> Void)) {
        let group = DispatchGroup()
        var team: Team? = nil
        var myTeam: TeamMember? = nil
        var shouldCallCompletion = true

        if !Database.default.queryTeamExists(withId: teamId, forServerUrl: serverUrl) {
            group.enter()

            guard let url = buildApiUrl(serverUrl, "/teams/\(teamId)") else {
                group.leave()
                shouldCallCompletion = false
                completionHandler(nil, nil)
                return
            }
            request(url, usingMethod: "GET", forServerUrl: serverUrl) { data, response, error in
                if let data = data {
                    team = try? JSONDecoder().decode(Team.self, from: data)
                }
                group.leave()
            }
        }

        if !Database.default.queryMyTeamExists(withId: teamId, forServerUrl: serverUrl) {
            group.enter()
            guard let url = buildApiUrl(serverUrl, "/teams/\(teamId)/members/me") else {
                group.leave()
                shouldCallCompletion = false
                completionHandler(nil, nil)
                return
            }
            request(url, usingMethod: "GET", forServerUrl: serverUrl) { data, response, error in
                if let data = data {
                    myTeam = try? JSONDecoder().decode(TeamMember.self, from: data)
                }
                group.leave()
            }
        }

        if shouldCallCompletion {
            // Use background queue for notification extension (not .main)
            group.notify(queue: DispatchQueue.global(qos: .default)) {
                completionHandler(team, myTeam)
            }
        }
    }
}
