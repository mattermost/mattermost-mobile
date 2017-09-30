//
//  ChannelController.swift
//  Mattermost
//
// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
//

import Foundation
import WatchKit

class PostAuthorRowController: NSObject {
  var userId: String?
  @IBOutlet weak var label: WKInterfaceLabel?
}

class PostBodyRowController: NSObject {
  var post: Post?
  @IBOutlet weak var accent: WKInterfaceSeparator?
  @IBOutlet weak var label: WKInterfaceLabel?
}

class PostTimeRowController: NSObject {
  @IBOutlet weak var label: WKInterfaceLabel?
}

struct ChannelContext {
  var teamId: String?
  var channelId: String
}

class ChannelController: WKInterfaceController {
  @IBOutlet weak var table: WKInterfaceTable?

  private var firstUpdateTime: Date?
  private var postWatcher: Int64?
  private var userWatcher: Int64?
  private var channelWatcher: Int64?
  private(set) var context: ChannelContext?
  
  override func awake(withContext context: Any?) {
    super.awake(withContext: context)
    self.context = context as? ChannelContext
  }

  override func willActivate() {
    super.willActivate()
    
    self.firstUpdateTime = nil

    let client = (WKExtension.shared().delegate as! ExtensionDelegate).client
    self.postWatcher = client.watchPosts(self.updatePosts)
    self.userWatcher = client.watchUsers(self.updateUsers)
    self.channelWatcher = client.watchChannels(self.updateTitle)
    client.requestPosts(forChannel: self.context!.channelId)
    if client.channels[self.context!.channelId] == nil && self.context!.teamId != nil {
      client.requestChannels(forTeam: self.context!.teamId!)
    }
  }
  
  override func didDeactivate() {
    let client = (WKExtension.shared().delegate as! ExtensionDelegate).client
    client.stopWatching(self.postWatcher!)
    client.stopWatching(self.userWatcher!)
    client.stopWatching(self.channelWatcher!)

    super.didDeactivate()
  }

  func updateTitle() {
    let client = (WKExtension.shared().delegate as! ExtensionDelegate).client

    let channel = client.channels[self.context!.channelId]
    if channel != nil && channel!.type == "D" {
      self.setTitle("Direct Message")
    } else {
      self.setTitle(channel?.displayName ?? "")
    }
  }

  func updatePosts() {
    let client = (WKExtension.shared().delegate as! ExtensionDelegate).client

    var posts: [Post] = []
    var rowTypes: [String] = []
    var rowPosts: [Post] = []
    var missingUsers = Set<String>()

    for post in client.posts {
      if post.value.channelId == self.context!.channelId {
        posts.append(post.value)
        if client.users.index(forKey: post.value.userId) == nil {
          missingUsers.insert(post.value.userId)
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
        rowController.userId = rowPosts[i].userId
      case let rowController as PostBodyRowController:
        rowController.post = rowPosts[i]
        rowController.accent?.setHidden(rowPosts[i].rootId == "")
        rowController.label!.setText(rowPosts[i].message)
      case let rowController as PostTimeRowController:
        let date = Date(timeIntervalSince1970: TimeInterval(rowPosts[i].createAt) / 1000.0)
        rowController.label!.setText(dateFormatter.string(from: date))
      default:
        break
      }
    }
    
    self.updateUsers()
    
    if rowTypes.count > 0 {
      if self.firstUpdateTime == nil {
        self.firstUpdateTime = Date()
      }

      if self.firstUpdateTime!.timeIntervalSinceNow > -1.0 {
        self.table?.scrollToRow(at: rowTypes.count-1)
      }
    }

    if missingUsers.count > 0 {
      client.requestUsers(withIds: Array(missingUsers))
    }
  }
  
  func updateUsers() {
    let client = (WKExtension.shared().delegate as! ExtensionDelegate).client

    if let table = self.table {
      for i in 0..<table.numberOfRows {
        if let rowController = table.rowController(at: i) as? PostAuthorRowController {
          if let user = client.users[rowController.userId!] {
            rowController.label!.setText("@" + user.username)
          } else {
            rowController.label!.setText(rowController.userId)
          }
        }
      }
    }
  }

  override func table(_ table: WKInterfaceTable, didSelectRowAt rowIndex: Int) {
    if let controller = table.rowController(at: rowIndex) as? PostBodyRowController {
      self.pushController(withName: "ThreadController", context: ThreadContext(postId: controller.post!.id))
    }
  }
  
  @IBAction func post(sender: WKInterfaceButton) {
    self.presentTextInputController(withSuggestions: nil, allowedInputMode: WKTextInputMode.allowEmoji) { results in
      if results != nil && results!.count > 0 {
        if let result = results![0] as? String {
          let client = (WKExtension.shared().delegate as! ExtensionDelegate).client
          client.post(message: result, inChannel: self.context!.channelId, withRoot: nil)
        }
      }
    }
  }
}
