//
//  ServerList.swift
//  SwiftUISample
//
//  Created by Elias Nahum on 20-06-22.
//

import Gekidou
import SwiftUI

struct ServerListView: View {
  @EnvironmentObject var shareViewModel: ShareViewModel
  
  var body: some View {
    List(shareViewModel.allServers) { server in
      ServerItemView(
        server: server
      )
    }
    .listStyle(.inset)
  }
}
