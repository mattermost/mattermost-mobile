//
//  ChannelListView.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import SwiftUI

struct ChannelListView: View {
  @EnvironmentObject var shareViewModel: ShareViewModel
  
  var body: some View {
    VStack (spacing: 0) {
      SearchBarView()
      if shareViewModel.search.isEmpty {
        HStack {
          Text(
            NSLocalizedString("mobile.channel_list.recent", value: "Recent", comment: "")
              .uppercased()
          )
          .font(Font.custom("OpenSans-SemiBold", size: 12))
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
