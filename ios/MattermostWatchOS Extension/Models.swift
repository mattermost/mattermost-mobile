//
//  Models.swift
//  Mattermost
//
// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
//

import Foundation

struct Team {
  var id: String
  var displayName: String
  
  init?(json: [String: Any]) {
    guard let id = json["id"] as? String,
      let displayName = json["display_name"] as? String
      else {
        return nil
    }
    self.id = id
    self.displayName = displayName
  }
}

struct Channel {
  var id: String
  var displayName: String
  var type: String
  var teamId: String
  var name: String
  
  init?(json: [String: Any]) {
    guard let id = json["id"] as? String,
      let displayName = json["display_name"] as? String,
      let name = json["name"] as? String,
      let teamId = json["team_id"] as? String,
      let type = json["type"] as? String
      else {
        return nil
    }
    self.id = id
    self.displayName = displayName
    self.name = name
    self.teamId = teamId
    self.type = type
  }
}

struct Post {
  var id: String
  var channelId: String
  var message: String
  var createAt: Int64
  var deleteAt: Int64
  var userId: String
  var rootId: String
  
  init?(json: [String: Any]) {
    guard let id = json["id"] as? String,
      let channelId = json["channel_id"] as? String,
      let message = json["message"] as? String,
      let userId = json["user_id"] as? String,
      let rootId = json["root_id"] as? String,
      let createAt = json["create_at"] as? Int64,
      let deleteAt = json["delete_at"] as? Int64
      else {
        return nil
    }
    self.id = id
    self.channelId = channelId
    self.message = message
    self.createAt = createAt
    self.deleteAt = deleteAt
    self.userId = userId
    self.rootId = rootId
  }
}

struct User {
  var id: String
  var username: String
  
  init?(json: [String: Any]) {
    guard let id = json["id"] as? String,
      let username = json["username"] as? String
      else {
        return nil
    }
    self.id = id
    self.username = username
  }
}
