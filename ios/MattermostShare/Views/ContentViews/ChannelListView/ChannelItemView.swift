//
//  ChannelItemView.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import SwiftUI

struct ChannelItemView: View {
  @Environment(\.presentationMode) var presentationMode: Binding<PresentationMode>
  @EnvironmentObject var shareViewModel: ShareViewModel
  
  var channel: ChannelModel
  
  var body: some View {
    Button(action: {
      shareViewModel.selectChannel(channel)
      self.presentationMode.wrappedValue.dismiss()
    }) {
      HStack(alignment: channel.type == "G" ? .center : .top) {
        if (channel.type ==  "D") {
          channel.image(serverUrl: shareViewModel.server!.url)
        } else {
          channel.icon(serverUrl: shareViewModel.server!.url)
        }
        VStack(alignment: .leading) {
          Text(channel.displayName)
            .lineLimit(1)
            .foregroundColor(Color.theme.centerChannelColor)
            .font(Font.custom("OpenSans", size: 16))
          if (!(channel.teamName?.isEmpty ?? true)) {
            Text(channel.teamName!)
              .lineLimit(1)
              .foregroundColor(Color.theme.centerChannelColor.opacity(0.64))
              .font(Font.custom("OpenSans", size: 12))
          }
        }
        Spacer()
      }
      .padding(.vertical, 8)
    }
    .frame(minHeight: 44, maxHeight: 58)
    .buttonStyle(.borderless)
    .listRowSeparator(.hidden)
    .listRowInsets(EdgeInsets(top: 8, leading: 0, bottom: 0, trailing: 0))
  }
}
