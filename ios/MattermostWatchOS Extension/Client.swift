//
//  Client.swift
//  Mattermost
//
// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
//

import Foundation

class Client {
  let dispatchQueue: DispatchQueue

  private(set) var url = ""
  private(set) var token = ""
  private(set) var teams: [String: Team] = [:]
  private(set) var channels: [String: Channel] = [:]
  private(set) var posts: [String: Post] = [:]
  private(set) var users: [String: User] = [:]

  private var _generation = 0

  private var _nextWatcherId: Int64 = 0
  private var _credentialWatchers: [Int64: () -> Void] = [:]
  private var _teamWatchers: [Int64: () -> Void] = [:]
  private var _channelWatchers: [Int64: () -> Void] = [:]
  private var _postWatchers: [Int64: () -> Void] = [:]
  private var _userWatchers: [Int64: () -> Void] = [:]

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
    self.posts = [:]
    self.users = [:]
    self._generation += 1
    self._notifyWatchers(self._credentialWatchers)
    self._notifyWatchers(self._postWatchers)
    self._notifyWatchers(self._teamWatchers)
    self._notifyWatchers(self._channelWatchers)
    self._notifyWatchers(self._userWatchers)
  }

  func hasCredentials() -> Bool {
    return self.url != "" && self.token != ""
  }
  
  func watchCredentials(_ handler: @escaping () -> Void) -> Int64 {
    return self._addWatcher(with: handler, to: &self._credentialWatchers)
  }
  
  func watchTeams(_ handler: @escaping () -> Void) -> Int64 {
    return self._addWatcher(with: handler, to: &self._teamWatchers)
  }
  
  func watchChannels(_ handler: @escaping () -> Void) -> Int64 {
    return self._addWatcher(with: handler, to: &self._channelWatchers)
  }

  func watchPosts(_ handler: @escaping () -> Void) -> Int64 {
    return self._addWatcher(with: handler, to: &self._postWatchers)
  }

  func watchUsers(_ handler: @escaping () -> Void) -> Int64 {
    return self._addWatcher(with: handler, to: &self._userWatchers)
  }

  func stopWatching(_ id: Int64) {
    self._credentialWatchers.removeValue(forKey: id)
    self._channelWatchers.removeValue(forKey: id)
    self._teamWatchers.removeValue(forKey: id)
    self._postWatchers.removeValue(forKey: id)
    self._userWatchers.removeValue(forKey: id)
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
  
  func http(_ request: inout URLRequest, handler: @escaping (Any) -> Void) {
    if !self.hasCredentials() {
      return
    }

    NSLog("requesting %@", request.url!.absoluteString)

    request.setValue("Bearer " + self.token, forHTTPHeaderField: "Authorization")
    let generation = self._generation
    let task = URLSession.shared.dataTask(with: request) { data, response, error in
      if let error = error {
        NSLog("error: %@", error.localizedDescription)
        return
      }
      
      guard let response = response as? HTTPURLResponse, response.statusCode >= 200 && response.statusCode < 300 else {
        NSLog("server error")
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
  
  func httpGET(_ api: String, handler: @escaping (Any) -> Void) {
    if let url = self.apiURL(api) {
      var request = URLRequest(url: url)
      self.http(&request, handler:handler)
    }
  }

  func httpPOST(_ api: String, body: Any, handler: @escaping (Any) -> Void) {
    if let url = self.apiURL(api) {
      var request = URLRequest(url: url)
      request.httpMethod = "POST"
      request.httpBody = try! JSONSerialization.data(withJSONObject: body, options: [])
      self.http(&request, handler:handler)
    }
  }

  func requestTeams() {
    self.httpGET("/v4/users/me/teams", handler: {json in
      self.teams = [:]
      if let jsonArray = json as? [[String: Any]] {
        for teamJSON in jsonArray {
          if let team = Team(json: teamJSON) {
            self.teams[team.id] = team
          }
        }
      }
      self._notifyWatchers(self._teamWatchers)
    })
  }
  
  func requestChannels(forTeam: String) {
    self.httpGET("/v4/users/me/teams/\(forTeam)/channels", handler: {json in
      self.channels = self.channels.filter({ (key: String, value: Channel) -> Bool in
        return value.teamId != "" && value.teamId != forTeam
      })
      if let jsonArray = json as? [[String: Any]] {
        for channelJSON in jsonArray {
          if let channel = Channel(json: channelJSON) {
            self.channels[channel.id] = channel
          }
        }
      }
      self._notifyWatchers(self._channelWatchers)
    })
  }
  
  func requestPosts(forChannel: String) {
    self.httpGET("/v4/channels/\(forChannel)/posts?per_page=30", handler: {json in
      if let jsonDict = json as? [String: Any] {
        if let jsonPosts = jsonDict["posts"] as? [String: Any] {
          for jsonPostKV in jsonPosts {
            if let jsonPost = jsonPostKV.value as? [String: Any] {
              if let post = Post(json: jsonPost) {
                self.posts[post.id] = post
              }
            }
          }
        }
      }
      self._notifyWatchers(self._postWatchers)
    })
  }

  func requestPosts(forThread: String) {
    self.httpGET("/v4/posts/\(forThread)/thread", handler: {json in
      self.posts = self.posts.filter({ (key: String, value: Post) -> Bool in
        return value.id != forThread && value.rootId != forThread
      })
      if let jsonDict = json as? [String: Any] {
        if let jsonPosts = jsonDict["posts"] as? [String: Any] {
          for jsonPostKV in jsonPosts {
            if let jsonPost = jsonPostKV.value as? [String: Any] {
              if let post = Post(json: jsonPost) {
                self.posts[post.id] = post
              }
            }
          }
        }
      }
      self._notifyWatchers(self._postWatchers)
    })
  }
  
  func requestUsers(withIds ids: [String]) {
    self.httpPOST("/v4/users/ids", body: ids, handler: {json in
      if let jsonArray = json as? [[String: Any]] {
        for jsonUser in jsonArray {
          if let user = User(json: jsonUser) {
            self.users[user.id] = user
          }
        }
      }
      self._notifyWatchers(self._userWatchers)
    })
  }
  
  func post(message: String, inChannel channel: String, withRoot root: String?) {
    self.httpPOST("/v4/posts", body:[
      "channel_id": channel,
      "message": message,
      "root_id": root ?? "",
    ], handler: {json in
      if let postJSON = json as? [String: Any] {
        if let post = Post(json: postJSON) {
          self.posts[post.id] = post
        }
      }
      self._notifyWatchers(self._postWatchers)
      self.requestPosts(forChannel: channel)
    })
  }
}
