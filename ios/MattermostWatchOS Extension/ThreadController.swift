//
//  ThreadController.swift
//  Mattermost
//
// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
//

import Foundation
import WatchKit

struct ThreadContext {
  var postId: String
}

class ThreadController: WKInterfaceController {
  @IBOutlet weak var table: WKInterfaceTable?
  
  private var firstUpdate = true
  private var postWatcher: Int64?
  private var userWatcher: Int64?
  private(set) var context: ThreadContext?

  override func awake(withContext context: Any?) {
    super.awake(withContext: context)
    self.context = context as? ThreadContext
  }
  
  override func willActivate() {
    super.willActivate()
    
    let client = (WKExtension.shared().delegate as! ExtensionDelegate).client
    self.postWatcher = client.watchPosts(self.update)
    self.userWatcher = client.watchUsers(self.update)
    client.requestPosts(forThread: self.context!.postId)
  }
  
  override func didDeactivate() {
    let client = (WKExtension.shared().delegate as! ExtensionDelegate).client
    client.stopWatching(self.postWatcher!)
    client.stopWatching(self.userWatcher!)

    super.didDeactivate()
  }
  
  func update() {
    var posts: [Post] = []
    var rowTypes: [String] = []
    var rowPosts: [Post] = []
    var missingUsers = Set<String>()

    let client = (WKExtension.shared().delegate as! ExtensionDelegate).client
    if let contextPost = client.posts[self.context!.postId] {
      let rootId = contextPost.rootId == "" ? contextPost.id : contextPost.rootId
      for post in client.posts {
        if post.value.id == rootId || post.value.rootId == rootId {
          posts.append(post.value)
          if client.users.index(forKey: post.value.userId) == nil {
            missingUsers.insert(post.value.userId)
          }
        }
      }
    }
    
    posts.sort { (a: Post, b: Post) -> Bool in
      return a.createAt < b.createAt
    }
    
    var previousUserId = ""
    var previousTime: Int64 = 0
    
    for post in posts {
      if post.createAt >= previousTime + 60 * 5 * 1000 {
        rowTypes.append("PostTime")
        rowPosts.append(post)
      }
      if post.userId != previousUserId {
        rowTypes.append("PostAuthor")
        rowPosts.append(post)
      }
      rowTypes.append("PostBody")
      rowPosts.append(post)
      previousUserId = post.userId
      previousTime = post.createAt
    }
    
    self.table?.setRowTypes(rowTypes)
    
    let dateFormatter = DateFormatter()
    dateFormatter.dateStyle = DateFormatter.Style.short
    dateFormatter.timeStyle = DateFormatter.Style.short
    
    for i in 0..<rowTypes.count {
      switch self.table?.rowController(at: i) {
      case let rowController as PostAuthorRowController:
        if let user = client.users[rowPosts[i].userId] {
          rowController.label!.setText("@" + user.username)
        } else {
          rowController.label!.setText(rowPosts[i].userId)
        }
      case let rowController as PostBodyRowController:
        rowController.label!.setText(rowPosts[i].message)
      case let rowController as PostTimeRowController:
        let date = Date(timeIntervalSince1970: TimeInterval(rowPosts[i].createAt) / 1000.0)
        rowController.label!.setText(dateFormatter.string(from: date))
      default:
        break
      }
    }
    
    if self.firstUpdate && rowTypes.count > 0 {
      self.table?.scrollToRow(at: rowTypes.count-1)
      self.firstUpdate = false
    }

    if missingUsers.count > 0 {
      client.requestUsers(withIds: Array(missingUsers))
    }
  }

  @IBAction func reply(sender: WKInterfaceButton) {
    let client = (WKExtension.shared().delegate as! ExtensionDelegate).client
    if let contextPost = client.posts[self.context!.postId] {
      self.presentTextInputController(withSuggestions: nil, allowedInputMode: WKTextInputMode.allowEmoji) { results in
        if results != nil && results!.count > 0 {
          if let result = results![0] as? String {
            client.post(message: result, inChannel: contextPost.channelId, withRoot: contextPost.rootId == "" ? contextPost.id : contextPost.rootId)
          }
        }
      }
    }
  }
}

