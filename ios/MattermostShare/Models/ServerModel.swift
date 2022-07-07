//
//  ServerModel.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import Foundation

struct ServerModel: Identifiable, Codable, Hashable {
  var id: String
  var displayName: String
  var url: String
  var hasChannels: Bool = false
  var maxMessageLength: Int64 = 4000
  var maxFileSize: Int64 = 50 * 1024 * 1024 // 50MB
  var maxImageResolution: Int64 = 7680 * 4320 // 8K, ~33MPX
  var uploadsDisabled: Bool = false
  
  enum ServerKeys: String, CodingKey {
    case id, url
    case displayName = "display_name"
  }
  
  init(id: String, displayName: String, url: String) {
    self.id = id
    self.displayName = displayName
    self.url = url
  }
  
  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: ServerKeys.self)
    id = try container.decode(String.self, forKey: .id)
    displayName = try container.decode(String.self, forKey: .displayName)
    url = try container.decode(String.self, forKey: .url)
  }
  
  mutating func updateSettings(_ hasChannels: Bool, _ postSize: Int64?, _ fileSize: Int64?, _ uploadsEnabled: Bool) {
    self.hasChannels = hasChannels
    self.uploadsDisabled = !uploadsEnabled
    
    if let length = postSize {
      self.maxMessageLength = length
    }
    
    if let size = fileSize {
      self.maxFileSize = size
    }
  }
}
