//
//  ChannelsController.swift
//  Mattermost
//
// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
//

import Foundation
import WatchKit

class ChannelRowController: NSObject {
  @IBOutlet weak var label: WKInterfaceLabel?
}

class ChannelsController: WKInterfaceController {
  @IBOutlet weak var publicChannelsTable: WKInterfaceTable?
  @IBOutlet weak var privateChannelsTable: WKInterfaceTable?
  @IBOutlet weak var directMessagesTable: WKInterfaceTable?

  private var channelsWatcher: Int64?
  private(set) var team: Team?

  override func awake(withContext context: Any?) {
    super.awake(withContext: context)
    self.team = context as? Team
  }

  override func willActivate() {
    super.willActivate()
    
    let client = (WKExtension.shared().delegate as! ExtensionDelegate).client
    self.channelsWatcher = client.watchChannels {
      self.updateTables()
    }
    client.requestChannels(forTeam: self.team!.id)
  }
  
  override func didDeactivate() {
    let client = (WKExtension.shared().delegate as! ExtensionDelegate).client
    if self.channelsWatcher != nil {
      client.stopWatching(self.channelsWatcher!)
    }
    
    super.didDeactivate()
  }
  
  func updateTables() {
    var publicChannels: [Channel] = []
    var privateChannels: [Channel] = []
    var directMessageChannels: [Channel] = []

    let client = (WKExtension.shared().delegate as! ExtensionDelegate).client
    for channel in client.channels {
      switch channel.value.type {
      case "O":
        publicChannels.append(channel.value)
      case "P":
        privateChannels.append(channel.value)
      case "D", "G":
        directMessageChannels.append(channel.value)
      default:
        break
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
      rowController.label!.setText(publicChannels[i].displayName)
    }

    self.privateChannelsTable?.setNumberOfRows(privateChannels.count, withRowType: "Channel")
    for i in 0..<privateChannels.count {
      let rowController = self.privateChannelsTable?.rowController(at: i) as! ChannelRowController
      rowController.label!.setText(privateChannels[i].displayName)
    }

    self.directMessagesTable?.setNumberOfRows(directMessageChannels.count, withRowType: "Channel")
    for i in 0..<directMessageChannels.count {
      let rowController = self.directMessagesTable?.rowController(at: i) as! ChannelRowController
      rowController.label!.setText(directMessageChannels[i].displayName)
    }
  }
  
  override func table(_ table: WKInterfaceTable, didSelectRowAt rowIndex: Int) {
    NSLog("did select row")
  }
}


