//
//  ShareViewModel.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import Foundation
import Combine
import Gekidou
import SwiftUI
import UIKit

class ShareViewModel: ObservableObject {
  @Published var server: ServerModel?
  @Published var allServers: [ServerModel] = []
  @Published var channel: ChannelModel?
  @Published var allChannels: [ChannelModel] = []
  @Published var search: String = ""
  
  private let serverService: ServerService = ServerService()
  private let channelService: ChannelService = ChannelService()
  private let fileManager = LocalFileManager()
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
  
  func getProfileImage(serverUrl: String, userId: String, imageBinding: Binding<UIImage?>) {
    if let image = fileManager.getProfileImage(userId: userId) {
      imageBinding.wrappedValue = image
    } else {
      downloadProfileImage(serverUrl: serverUrl, userId: userId, imageBinding: imageBinding)
    }
  }
  
  func downloadProfileImage(serverUrl: String, userId: String, imageBinding: Binding<UIImage?>) {
    guard let _ = URL(string: serverUrl) else {
      fatalError("Missing or Malformed URL")
    }
    
    Gekidou.Network.default.fetchUserProfilePicture(userId: userId, withServerUrl: serverUrl, completionHandler: {data, response, error in
      guard (response as? HTTPURLResponse)?.statusCode == 200 else {
        fatalError("Error while fetching image \(String(describing: (response as? HTTPURLResponse)?.statusCode))")
      }
      
      if let data = data {
        let image = UIImage(data: data)
        imageBinding.wrappedValue = image
        if let img = image {
          self.fileManager.saveProfileImage(image: img, userId: userId)
        }
      }
    })
  }
}
