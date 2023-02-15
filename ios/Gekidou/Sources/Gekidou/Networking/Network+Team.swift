import Foundation

extension Network {
    public func fetchTeamIfNeeded(withId teamId: String, forServerUrl serverUrl: String, completionHandler: @escaping ((_ team: Team?, _ myTeam: TeamMember?) -> Void)) {
        let group = DispatchGroup()
        var team: Team? = nil
        var myTeam: TeamMember? = nil
        
        if !Database.default.queryTeamExists(withId: teamId, forServerUrl: serverUrl) {
            group.enter()
            
            let url = buildApiUrl(serverUrl, "/teams/\(teamId)")
            request(url, usingMethod: "GET", forServerUrl: serverUrl) { data, response, error in
                if let data = data {
                    team = try? JSONDecoder().decode(Team.self, from: data)
                }
                group.leave()
            }
        }
        
        if !Database.default.queryMyTeamExists(withId: teamId, forServerUrl: serverUrl) {
            group.enter()
            let url = buildApiUrl(serverUrl, "/teams/\(teamId)/members/me")
            request(url, usingMethod: "GET", forServerUrl: serverUrl) { data, response, error in
                if let data = data {
                    myTeam = try? JSONDecoder().decode(TeamMember.self, from: data)
                }
                group.leave()
            }
        }
        
        group.notify(queue: .main) {
            completionHandler(team, myTeam)
        }
    }
}
