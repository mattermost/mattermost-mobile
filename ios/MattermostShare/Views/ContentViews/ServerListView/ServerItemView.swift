//
//  ServerItemView.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import SwiftUI

struct ServerItemView: View {
  @Environment(\.presentationMode) var presentationMode: Binding<PresentationMode>
  @EnvironmentObject var shareViewModel: ShareViewModel
  
  var server: ServerModel
  
  var body: some View {
    Button(action: {
      guard !server.isZeroPersistence else { return }
      shareViewModel.selectServer(server)
      self.presentationMode.wrappedValue.dismiss()
    }) {
      HStack {
        FontIcon.text(
          .compassIcons(code: .server),
          fontsize: 24,
          color: Color.theme.centerChannelColor.opacity(0.56)
        )
        VStack(alignment: .leading) {
          Text(server.displayName)
            .foregroundColor(Color.theme.centerChannelColor)
            .lineLimit(1)
            .font(Font.custom("OpenSans-SemiBold", size: 16))
          Text(server.url)
            .foregroundColor(Color.theme.centerChannelColor.opacity(0.72))
            .lineLimit(1)
            .font(Font.custom("OpenSans", size: 12))
          if server.isZeroPersistence {
            Text(NSLocalizedString(
              "share_extension.server_item.zero_persistence_unavailable",
              value: "Sharing unavailable for this server",
              comment: ""
            ))
            .foregroundColor(Color.theme.centerChannelColor.opacity(0.56))
            .lineLimit(1)
            .font(Font.custom("OpenSans", size: 12))
          }
        }
      }
      .padding(.horizontal)
      .frame(
        minWidth: 0,
        maxWidth: .infinity,
        minHeight: 72,
        idealHeight: 72,
        alignment: .leading
      )
    }
    .opacity(server.isZeroPersistence ? 0.48 : 1.0)
    .disabled(server.isZeroPersistence)
    .background(
      RoundedRectangle(cornerRadius: 8)
        .fill(Color.theme.centerChannelColor.opacity(0.04))
    )
    .buttonStyle(.borderless)
    .listRowSeparator(.hidden)
    .listRowInsets(EdgeInsets(top: 8, leading: 0, bottom: 0, trailing: 0))
  }
}
