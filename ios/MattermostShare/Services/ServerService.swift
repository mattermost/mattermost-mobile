//
//  ServerService.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import Gekidou
import Foundation

class ServerService: ObservableObject {
  @Published var selected: ServerModel?
  @Published var servers: [ServerModel] = []
  
  init() {
    let current: ServerModel? = Gekidou.Database.default.getCurrentServerDatabase()
    selected = updateServerSettings(current)
    
    getServers()
  }
  
  func getServers() {
    let allServers: [ServerModel] = Gekidou.Database.default.getAllActiveDatabases()
    allServers.forEach { server in
      if let s = updateServerSettings(server) {
        servers.append(s)
      }
    }
  }
  
  private func updateServerSettings(_ server: ServerModel?) -> ServerModel? {
    if var s = server {
      if let config = Gekidou.Database.default.getConfig(s.url) {
        let hasChannels = Gekidou.Database.default.serverHasChannels(s.url)
        
        var maxFileSize: Int64? = nil
        if let fileSize = config["MaxFileSize"] as? String {
          maxFileSize = Int64(fileSize)
        }
        
        var maxPostSize: Int64? = nil
        if let length = config["MaxPostSize"] as? String {
          maxPostSize = Int64(length)
        }
        
        let uploadsEnabled = config["EnableMobileFileUpload"] as? String == "true"
        s.updateSettings(hasChannels, maxPostSize, maxFileSize, uploadsEnabled)
        return s
      }
    }
    return nil
  }
}
