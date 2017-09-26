//
//  TeamsController.swift
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

class TeamsController: WKInterfaceController {
  var credentialsWatcher: Int64?
  var teamsWatcher: Int64?

  @IBOutlet weak var table: WKInterfaceTable?
  
  override func willActivate() {
    super.willActivate()

    let client = (WKExtension.shared().delegate as! ExtensionDelegate).client
    self.credentialsWatcher = client.watchCredentials {
      self.checkCredentials()
    }
    self.teamsWatcher = client.watchTeams {
      self.updateTable()
    }
    client.requestTeams()
  }
  
  override func didDeactivate() {
    let client = (WKExtension.shared().delegate as! ExtensionDelegate).client
    if self.credentialsWatcher != nil {
      client.stopWatching(self.credentialsWatcher!)
    }
    if self.teamsWatcher != nil {
      client.stopWatching(self.teamsWatcher!)
    }

    super.didDeactivate()
  }
  
  func checkCredentials() {
    let client = (WKExtension.shared().delegate as! ExtensionDelegate).client
    if !client.hasCredentials() {
      WKInterfaceController.reloadRootControllers(withNamesAndContexts: [(name: "AuthenticationController", context: 0 as AnyObject)])
    }
  }
  
  func updateTable() {
    let client = (WKExtension.shared().delegate as! ExtensionDelegate).client
    var teams: [Team] = []
    for team in client.teams {
      teams.append(team.value)
    }
    teams.sort { (a: Team, b: Team) -> Bool in
      return a.displayName.caseInsensitiveCompare(b.displayName) == ComparisonResult.orderedAscending
    }
    self.table?.setNumberOfRows(teams.count, withRowType: "Team")
    for i in 0..<teams.count {
      let controller = self.table?.rowController(at: i) as! TeamRowController
      controller.team = teams[i]
      controller.label!.setText(teams[i].displayName)
    }
  }
  
  override func table(_ table: WKInterfaceTable, didSelectRowAt rowIndex: Int) {
    let controller = self.table?.rowController(at: rowIndex) as! TeamRowController
    self.pushController(withName: "ChannelsController", context: controller.team!)
  }
}

