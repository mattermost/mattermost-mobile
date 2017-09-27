//
//  TeamController.swift
//  Mattermost
//
// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
//

import Foundation
import WatchKit

class ChannelRowController: NSObject {
  var channel: Channel?
  @IBOutlet weak var label: WKInterfaceLabel?
}

struct TeamContext {
  var teamId: String
}

class TeamController: WKInterfaceController {
  @IBOutlet weak var publicChannelsTable: WKInterfaceTable?
  @IBOutlet weak var privateChannelsTable: WKInterfaceTable?

  private var channelWatcher: Int64?
  private var teamWatcher: Int64?
  private(set) var context: TeamContext?

  override func awake(withContext context: Any?) {
    super.awake(withContext: context)
    self.context = context as? TeamContext
  }

  override func willActivate() {
    super.willActivate()
    
    let client = (WKExtension.shared().delegate as! ExtensionDelegate).client
    self.channelWatcher = client.watchChannels(self.update)
    self.teamWatcher = client.watchTeams(self.update)
    client.requestChannels(forTeam: self.context!.teamId)
    if client.teams[self.context!.teamId] == nil {
      client.requestTeams()
    }
  }
  
  override func didDeactivate() {
    let client = (WKExtension.shared().delegate as! ExtensionDelegate).client
    client.stopWatching(self.channelWatcher!)
    client.stopWatching(self.teamWatcher!)

    super.didDeactivate()
  }
  
  func update() {
    let client = (WKExtension.shared().delegate as! ExtensionDelegate).client

    self.setTitle(client.teams[self.context!.teamId]?.displayName ?? "")

    var publicChannels: [Channel] = []
    var privateChannels: [Channel] = []

    for channel in client.channels {
      if channel.value.teamId == self.context!.teamId {
        switch channel.value.type {
        case "O":
          publicChannels.append(channel.value)
        case "P":
          privateChannels.append(channel.value)
        default:
          break
        }
      }
    }
    
    publicChannels.sort { (a: Channel, b: Channel) -> Bool in
      return a.displayName.caseInsensitiveCompare(b.displayName) == ComparisonResult.orderedAscending
    }

    privateChannels.sort { (a: Channel, b: Channel) -> Bool in
      return a.displayName.caseInsensitiveCompare(b.displayName) == ComparisonResult.orderedAscending
    }

    self.publicChannelsTable?.setNumberOfRows(publicChannels.count, withRowType: "Channel")
    for i in 0..<publicChannels.count {
      let rowController = self.publicChannelsTable?.rowController(at: i) as! ChannelRowController
      rowController.channel = publicChannels[i]
      rowController.label!.setText(publicChannels[i].displayName)
    }

    self.privateChannelsTable?.setNumberOfRows(privateChannels.count, withRowType: "Channel")
    for i in 0..<privateChannels.count {
      let rowController = self.privateChannelsTable?.rowController(at: i) as! ChannelRowController
      rowController.channel = privateChannels[i]
      rowController.label!.setText(privateChannels[i].displayName)
    }
  }
  
  override func table(_ table: WKInterfaceTable, didSelectRowAt rowIndex: Int) {
    let controller = table.rowController(at: rowIndex) as! ChannelRowController
    let context = ChannelContext(teamId: controller.channel!.teamId == "" ? nil : controller.channel!.teamId, channelId: controller.channel!.id)
    self.pushController(withName: "ChannelController", context: context)
  }
}


