//
//  ChannelService.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import Gekidou
import Foundation

class ChannelService: ObservableObject {
  private var serverUrl: String
  
  @Published var selected: ChannelModel?
  @Published var channels: [ChannelModel] = []
  
  init() {
    self.serverUrl = ""
  }
  
  init(_ serverUrl: String) {
    self.serverUrl = serverUrl
    setServerUrl(serverUrl)
  }
  
  func setServerUrl(_ url: String) {
    self.serverUrl = url
    getCurrentChannel()
    getChannels()
  }
  
  // Conversations are hidden while a DM/GM policy denies reading or writing them.
  private var hideConversations: Bool {
    let access = Gekidou.Database.default.getDmGmAccess(self.serverUrl)
    return !access.read || !access.write
  }
  
  func getCurrentChannel() {
    selected = Gekidou.Database.default.getCurrentChannelWithTeam(self.serverUrl)
    if hideConversations && (selected?.type == "D" || selected?.type == "G") {
      selected = nil
    }
  }
  
  func getChannels() {
    channels = Gekidou.Database.default.getChannelsWithTeam(self.serverUrl, excludeDirect: hideConversations)
      .filter { channel in
        if let deactivated = channel.deactivated {
          return !deactivated || (deactivated && channel.type != "D")
        }
        
        return true
      }
    
    if selected == nil || ((selected!.deactivated ?? false) && selected?.type == "D") {
      selected = channels.first
    }
  }
  
  func searchChannels(_ term: String) -> [ChannelModel] {
    let joinedChannelsMatchStart: [ChannelModel] = Gekidou.Database.default.searchJoinedChannels(serverUrl, term: term)
    let excludeDirect = hideConversations
    let directChannelsMatchStart: [ChannelModel] = Gekidou.Database.default.searchDirectChannels(serverUrl, term: term, excludeDirect: excludeDirect)
    let channelsMatchStart = (joinedChannelsMatchStart + directChannelsMatchStart).sorted { ($0.lastViewedAt ?? 0) > ($1.lastViewedAt ?? 0)}
    
    let joinedChannelsMatch: [ChannelModel] = Gekidou.Database.default.searchJoinedChannels(serverUrl, term: term, matchStart: false)
    let directChannelsMatch: [ChannelModel] = Gekidou.Database.default.searchDirectChannels(serverUrl, term: term, matchStart: false, excludeDirect: excludeDirect)
    let channelsMatch = (joinedChannelsMatch + directChannelsMatch).sorted { ($0.lastViewedAt ?? 0) > ($1.lastViewedAt ?? 0)}
    
    return (channelsMatchStart + channelsMatch)
      .filter { channel in
        if let deactivated = channel.deactivated {
          return !deactivated || (deactivated && channel.type != "D")
        }
        
        return true
      }
  }
}
