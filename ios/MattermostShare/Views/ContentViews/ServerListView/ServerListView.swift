//
//  ServerListView.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import SwiftUI

struct ServerListView: View {
  @EnvironmentObject var shareViewModel: ShareViewModel
  
  var body: some View {
    List(shareViewModel.allServers) { server in
      ServerItemView(
        server: server
      )
    }
    .listStyle(.plain)
    .padding(20)
  }
}
