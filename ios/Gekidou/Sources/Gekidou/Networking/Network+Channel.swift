import Foundation

extension Network {
    public func fetchMyChannel(withId channelId: String, forServerUrl serverUrl: String, completionHandler: @escaping ((_ channel: Channel?, _ myChannel: ChannelMember?, _ profiles: [User]?) -> Void)) {
        let group = DispatchGroup()
        var channel: Channel? = nil
        var tempChannel: Channel? = nil
        var myChannel: ChannelMember? = nil
        var profiles: [User]? = nil
        
        group.enter()
        guard let channelUrl = buildApiUrl(serverUrl, "/channels/\(channelId)") else {
            completionHandler(nil, nil, nil)
            return
        }
        request(channelUrl, usingMethod: "GET", forServerUrl: serverUrl) { data, response, error in
            if let data = data {
                tempChannel = try? JSONDecoder().decode(Channel.self, from: data)
            }
            group.leave()
        }

        group.enter()
        guard let myChannelUrl = buildApiUrl(serverUrl, "/channels/\(channelId)/members/me") else {
            completionHandler(nil, nil, nil)
            return
        }
        request(myChannelUrl, usingMethod: "GET", forServerUrl: serverUrl) { data, response, error in
            if let data = data {
                myChannel = try? JSONDecoder().decode(ChannelMember.self, from: data)
            }
            group.leave()
        }
        
        // Use background queue for notification extension - no UI updates needed
        group.notify(queue: DispatchQueue.global(qos: .default)) {
            if let tempChannel = tempChannel,
               (tempChannel.type == "D" || tempChannel.type == "G")
                && !Database.default.queryChannelExists(withId: channelId, forServerUrl: serverUrl) {
                let displayNameSetting = Database.default.getTeammateDisplayNameSetting(serverUrl)
                Network.default.fetchProfiles(inChannelId: channelId, forServerUrl: serverUrl) {[weak self] data, response, error in
                    guard let self = self else { return }
                    guard let data = data else {
                        if let error = error {
                            GekidouLogger.shared.log(.error, "Gekidou Network: Failed to fetch profiles for channel %{public}@ - %{public}@", channelId, String(describing: error))
                        }
                        completionHandler(channel, myChannel, profiles)
                        return
                    }

                    do {
                        let currentUserId = try Database.default.queryCurrentUserId(serverUrl)
                        let users = try JSONDecoder().decode([User].self, from: data)
                        if !users.isEmpty {
                            profiles = users.filter{ $0.id != currentUserId}
                            if tempChannel.type == "D",
                               let profiles = profiles,
                               let user = profiles.first {
                                var chan = tempChannel
                                chan.displayName = self.displayUsername(user, displayNameSetting)
                                channel = chan
                            } else if let profiles = profiles {
                                let locale = Database.default.getCurrentUserLocale(serverUrl)
                                var chan = tempChannel
                                chan.displayName = self.displayGroupMessageName(profiles, locale: locale, displayNameSetting: displayNameSetting)
                                channel = chan
                            }
                        }
                    } catch {
                        GekidouLogger.shared.log(.error, "Gekidou Network: Failed to decode profiles or query userId for channel %{public}@ on server %{public}@ - %{public}@", channelId, serverUrl, String(describing: error))
                    }
                    completionHandler(channel, myChannel, profiles)
                }
            } else {
                channel = tempChannel
                completionHandler(channel, myChannel, profiles)
            }
        }
    }
    
    private func displayUsername(_ user: User, _ displayNameSetting: String) -> String {
        switch (displayNameSetting) {
        case "nickname_full_name":
            if !user.nickname.isEmpty {
                return user.nickname
            }
            return "\(user.firstName) \(user.lastName)".trimmingCharacters(in: .whitespacesAndNewlines)
        case "full_name":
            return "\(user.firstName) \(user.lastName)".trimmingCharacters(in: .whitespacesAndNewlines)
        default:
            return user.username
        }
    }
    
    private func displayGroupMessageName(_ users: [User], locale: String, displayNameSetting: String) -> String {
        var names = [String]()
        for user in users {
            names.append(displayUsername(user, displayNameSetting))
        }
        
        let sorted = names.sorted { (lhs: String, rhs: String) -> Bool in
            return lhs.compare(rhs, options: [.caseInsensitive], locale: Locale(identifier: locale)) == .orderedAscending
        }
        
        return sorted.joined(separator: ", ").trimmingCharacters(in: .whitespaces)
    }
}
