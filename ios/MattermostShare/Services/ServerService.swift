//
//  ServerViewModel.swift
//  MattermostShare
//
//  Created by Elias Nahum on 24-06-22.
//  Copyright © 2022 Facebook. All rights reserved.
//

import Gekidou
import Foundation

// in the view on init (first view in the tree) use @StateObject otherwise use @ObserveObject

class ServerService: ObservableObject {
  @Published var selected: ServerModel?
  @Published var servers: [ServerModel] = []
  
  init() {
    selected = Gekidou.Database.default.getCurrentServerDatabase()
    
    getServers()
  }
  
  func getServers() {
    servers = Gekidou.Database.default.getAllActiveDatabases()
  }
  
}
