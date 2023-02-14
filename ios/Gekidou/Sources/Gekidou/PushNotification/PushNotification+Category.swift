import Foundation

extension PushNotification {
    func addChannelToDefaultCategoryIfNeeded(_ channel: Channel, forServerUrl serverUrl: String) -> [CategoryChannel]? {
        var categoryChannels = [CategoryChannel]()
        if channel.type == "D" || channel.type == "G" {
            if let teamIds = Database.default.queryAllMyTeamIds(serverUrl) {
                for teamId in teamIds {
                    if let item = categoryChannelForTeam(channelId: channel.id, teamId: teamId, type: "direct_messages", forServerUrl: serverUrl) {
                        categoryChannels.append(item)
                    }
                }
                return categoryChannels
            }
        } else if let item = categoryChannelForTeam(channelId: channel.id, teamId: channel.teamId, type: "channels", forServerUrl: serverUrl) {
            categoryChannels.append(item)
            return categoryChannels
        }
        return nil
    }
    
    private func categoryChannelForTeam(channelId: String, teamId: String, type: String, forServerUrl serverUrl: String) -> CategoryChannel? {
        guard !teamId.isEmpty,
              let categoryId = Database.default.queryCategoryId(inTeamId: teamId, type: type, forServerUrl: serverUrl) else { return nil }
        
        let cc = Database.default.queryCategoryChannelId(inCategoryId: categoryId, channelId: channelId, forServerUrl: serverUrl)
        if cc == nil {
            return CategoryChannel(
                id: "\(teamId)_\(channelId)",
                categoryId: categoryId,
                channelId: channelId
            )
        }
        
        return nil
    }
}
