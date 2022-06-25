//
//  ShareViewModel.swift
//  MattermostShare
//
//  Created by Elias Nahum on 25-06-22.
//  Copyright © 2022 Facebook. All rights reserved.
//

import Foundation
import Combine

class ShareViewModel: ObservableObject {
  @Published var server: ServerModel?
  @Published var allServers: [ServerModel] = []
  @Published var channel: ChannelModel?
  @Published var allChannels: [ChannelModel] = []
  @Published var search: String = ""
  
  private let serverService: ServerService = ServerService()
  private let channelService: ChannelService = ChannelService()
  private var cancellables = Set<AnyCancellable>()
  
  init() {
    addSubscribers()
  }
  
  private func addSubscribers() {
    // Selected server
    serverService.$selected
      .sink {[weak self] (server) in
        self?.server = server
        if let url = server?.url {
          self?.channelService.setServerUrl(url)
          self?.search = ""
        }
      }
      .store(in: &cancellables)
    
    // All active servers
    serverService.$servers
      .sink {[weak self] (servers) in
        self?.allServers = servers
      }
      .store(in: &cancellables)
    
    channelService.$selected
      .sink{ [weak self] channel in
        self?.channel = channel
        self?.search = ""
      }
      .store(in: &cancellables)
    
    $search
      .debounce(for: .seconds(0.2), scheduler: DispatchQueue.main)
      .map { (text) -> [ChannelModel] in
        guard !text.isEmpty else {
          return self.channelService.channels
        }
        let channels: [ChannelModel] = self.channelService.searchChannels(text)
        return channels
      }
      .sink {[weak self] channels in
        self?.allChannels = channels
      }
      .store(in: &cancellables)
  }
  
  public func selectServer(_ server: ServerModel) {
    serverService.selected = server
  }
  
  public func selectChannel(_ channel: ChannelModel) {
    channelService.selected = channel
  }
}
