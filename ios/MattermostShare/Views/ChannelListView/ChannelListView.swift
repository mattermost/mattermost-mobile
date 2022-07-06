//
//  ChannelListView.swift
//  SwiftUISample
//
//  Created by Elias Nahum on 21-06-22.
//

import SwiftUI

struct ChannelListView: View {
  @EnvironmentObject var shareViewModel: ShareViewModel
  
  var body: some View {
    VStack (spacing: 0) {
      SearchBarView()
      if shareViewModel.search.isEmpty {
          HStack {
              Text("RECENT")
                  .font(Font.custom("OpenSans", size: 12))
                  .foregroundColor(Color.theme.centerChannelColor.opacity(0.64))
              Spacer()
          }
          .padding(.top, 20)
      }
      List(shareViewModel.allChannels) { channel in
        ChannelItemView(
          channel: channel
        )
      }
      .listStyle(.plain)
      .onDisappear {
        if !shareViewModel.search.isEmpty {
          shareViewModel.search = ""
        }
      }
    }
    .padding(.top, 20)
    .padding(.horizontal, 20)
  }
}
