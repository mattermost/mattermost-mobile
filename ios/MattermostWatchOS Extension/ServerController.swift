//
//  ServerController.swift
//  Mattermost
//
// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
//

import Foundation
import WatchKit

class TeamRowController: NSObject {
  var team: Team?
  @IBOutlet weak var label: WKInterfaceLabel?
}

class ServerController: WKInterfaceController {
  var channelWatcher: Int64?
  var credentialWatcher: Int64?
  var teamWatcher: Int64?
  var userWatcher: Int64?

  @IBOutlet weak var teamsTable: WKInterfaceTable?
  @IBOutlet weak var directMessagesTable: WKInterfaceTable?

  override func willActivate() {
    super.willActivate()

    let client = (WKExtension.shared().delegate as! ExtensionDelegate).client
    self.channelWatcher = client.watchChannels(self.update)
    self.credentialWatcher = client.watchCredentials(self.checkCredentials)
    self.userWatcher = client.watchUsers(self.update)
    self.teamWatcher = client.watchTeams {
      if client.teams.first != nil {
        client.requestChannels(forTeam: client.teams.first!.value.id)
      }
      self.update()
    }
    client.requestTeams()
  }
  
  override func didDeactivate() {
    let client = (WKExtension.shared().delegate as! ExtensionDelegate).client
    client.stopWatching(self.credentialWatcher!)
    client.stopWatching(self.teamWatcher!)
    client.stopWatching(self.userWatcher!)
    client.stopWatching(self.channelWatcher!)

    super.didDeactivate()
  }
  
  func checkCredentials() {
    let client = (WKExtension.shared().delegate as! ExtensionDelegate).client
    if !client.hasCredentials() {
      WKInterfaceController.reloadRootControllers(withNamesAndContexts: [(name: "AuthenticationController", context: 0 as AnyObject)])
    }
  }
  
  func update() {
    let client = (WKExtension.shared().delegate as! ExtensionDelegate).client

    var teams: [Team] = []
    for team in client.teams {
      teams.append(team.value)
    }
    teams.sort { (a: Team, b: Team) -> Bool in
      return a.displayName.caseInsensitiveCompare(b.displayName) == ComparisonResult.orderedAscending
    }
    self.teamsTable?.setNumberOfRows(teams.count, withRowType: "Team")
    for i in 0..<teams.count {
      let controller = self.teamsTable?.rowController(at: i) as! TeamRowController
      controller.team = teams[i]
      controller.label!.setText(teams[i].displayName)
    }

    var missingUsers = Set<String>()

    var channels: [Channel] = []
    for channel in client.channels {
      if channel.value.type == "D" {
        let userIds = channel.value.name.components(separatedBy: "__")
        if userIds.count == 2 {
          if client.users[userIds[0]] == nil {
            missingUsers.insert(userIds[0])
          }
          if client.users[userIds[1]] == nil {
            missingUsers.insert(userIds[1])
          }
        }
        channels.append(channel.value)
      } else if channel.value.type == "G" {
        channels.append(channel.value)
      }
    }
    channels.sort { (a: Channel, b: Channel) -> Bool in
      return self.labelForChannel(a).caseInsensitiveCompare(self.labelForChannel(b)) == ComparisonResult.orderedAscending
    }
    
    if missingUsers.count > 0 {
      client.requestUsers(withIds: Array(missingUsers))
    } else {
      self.directMessagesTable?.setNumberOfRows(channels.count, withRowType: "Channel")
      for i in 0..<channels.count {
        let controller = self.directMessagesTable?.rowController(at: i) as! ChannelRowController
        controller.channel = channels[i]
        controller.label!.setText(self.labelForChannel(channels[i]))
      }
    }
  }
  
  func labelForChannel(_ channel: Channel) -> String {
    if channel.displayName != "" {
      return channel.displayName
    }
    let client = (WKExtension.shared().delegate as! ExtensionDelegate).client
    let userIds = channel.name.components(separatedBy: "__")
    if userIds.count == 2 && client.users[userIds[0]] != nil && client.users[userIds[1]] != nil {
      var names = userIds.map { userId in
        return client.users[userId]!.username
      }
      names.sort { (a: String, b: String) -> Bool in
        return a.caseInsensitiveCompare(b) == ComparisonResult.orderedAscending
      }
      return names.joined(separator: ", ")
    }
    return channel.id
  }
  
  override func table(_ table: WKInterfaceTable, didSelectRowAt rowIndex: Int) {
    if let controller = table.rowController(at: rowIndex) as? TeamRowController {
      self.pushController(withName: "TeamController", context: TeamContext(teamId: controller.team!.id))
    } else if let controller = table.rowController(at: rowIndex) as? ChannelRowController {
      let context = ChannelContext(teamId: nil, channelId: controller.channel!.id)
      self.pushController(withName: "ChannelController", context: context)
    }
  }
}

