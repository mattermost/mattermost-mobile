//
//  Client.swift
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

  init?(json: [String: Any]) {
    guard let id = json["id"] as? String,
      let displayName = json["display_name"] as? String,
      let type = json["type"] as? String
    else {
        return nil
    }
    self.id = id
    self.displayName = displayName
    self.type = type
  }
}

class Client {
  let dispatchQueue: DispatchQueue

  private(set) var url = ""
  private(set) var token = ""
  private(set) var teams: [String: Team] = [:]
  private(set) var channels: [String: Channel] = [:]

  private var _generation = 0

  private var _nextWatcherId: Int64 = 0
  private var _credentialsWatchers: [Int64: () -> Void] = [:]
  private var _teamsWatchers: [Int64: () -> Void] = [:]
  private var _channelsWatchers: [Int64: () -> Void] = [:]

  init(dispatchQueue: DispatchQueue) {
    self.dispatchQueue = dispatchQueue
  }

  func setCredentials(url : String, token : String) {
    let normalizedURL = url.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    if (normalizedURL == self.url && token == self.token) {
      return
    }

    self.url = normalizedURL
    self.token = token
    self.channels = [:]
    self.teams = [:]
    self._generation += 1
    self._notifyWatchers(self._credentialsWatchers)
    self._notifyWatchers(self._teamsWatchers)
    self._notifyWatchers(self._channelsWatchers)
  }

  func hasCredentials() -> Bool {
    return self.url != "" && self.token != ""
  }
  
  func watchCredentials(_ handler: @escaping () -> Void) -> Int64 {
    return self._addWatcher(with: handler, to: &self._credentialsWatchers)
  }
  
  func watchTeams(_ handler: @escaping () -> Void) -> Int64 {
    return self._addWatcher(with: handler, to: &self._teamsWatchers)
  }
  
  func watchChannels(_ handler: @escaping () -> Void) -> Int64 {
    return self._addWatcher(with: handler, to: &self._channelsWatchers)
  }
  
  func stopWatching(_ id: Int64) {
    self._credentialsWatchers.removeValue(forKey: id)
    self._teamsWatchers.removeValue(forKey: id)
  }
  
  private func _addWatcher(with handler: @escaping () -> Void, to: inout [Int64: () -> Void]) -> Int64 {
    let id = self._nextWatcherId
    self._nextWatcherId += 1
    to[id] = handler
    self.dispatchQueue.async(execute: handler)
    return id
  }
  
  private func _notifyWatchers(_ watchers: [Int64: () -> Void]) {
    for watcher in watchers {
      self.dispatchQueue.async(execute: watcher.value)
    }
  }

  func apiURL(_ api: String) -> URL? {
    if self.url == "" {
      return nil
    }
    return URL(string: self.url + "/api" + api)
  }
  
  func get(_ api: String, handler: @escaping (Any) -> Void) {
    if !self.hasCredentials() {
      return
    }

    if let url = self.apiURL(api) {
      var request = URLRequest(url: url)
      request.setValue("Bearer " + self.token, forHTTPHeaderField: "Authorization")
      let generation = self._generation
      let task = URLSession.shared.dataTask(with: request) { data, response, error in
        if let error = error {
          NSLog("Error: %@", error.localizedDescription)
          return
        }
        
        guard let response = response as? HTTPURLResponse, response.statusCode == 200 else {
          NSLog("Server error")
          return
        }
        
        if let json = try? JSONSerialization.jsonObject(with: data!, options: []) {
          self.dispatchQueue.async {
            if generation == self._generation {
              handler(json)
            }
          }
        }
      }
      task.resume()
    }
  }

  func requestTeams() {
    self.get("/v4/users/me/teams", handler: {json in
      self.teams = [:]
      if let jsonArray = json as? [[String: Any]] {
        for teamJSON in jsonArray {
          if let team = Team(json: teamJSON) {
            self.teams[team.id] = team
          }
        }
      }
      self._notifyWatchers(self._teamsWatchers)
    })
  }
  
  func requestChannels(forTeam: String) {
    self.get("/v4/users/me/teams/"+forTeam+"/channels", handler: {json in
      self.channels = [:]
      if let jsonArray = json as? [[String: Any]] {
        for channelJSON in jsonArray {
          if let channel = Channel(json: channelJSON) {
            self.channels[channel.id] = channel
          }
        }
      }
      self._notifyWatchers(self._channelsWatchers)
    })
  }
}
