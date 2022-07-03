//
//  ChannelListView.swift
//  SwiftUISample
//
//  Created by Elias Nahum on 21-06-22.
//

import SwiftUI

struct ChannelListView: View {
  @EnvironmentObject var shareViewModel: ShareViewModel
  @State private var search = ""
  
  var body: some View {
    VStack (spacing: 0) {
      SearchBarView()
        .padding()
      List(shareViewModel.allChannels) { channel in
        ChannelItemView(
          channel: channel
        )
      }
      .listStyle(.plain)
      .padding(.horizontal, 20)
      .onDisappear {
        if !shareViewModel.search.isEmpty {
          shareViewModel.search = ""
        }
      }
    }
  }
}
