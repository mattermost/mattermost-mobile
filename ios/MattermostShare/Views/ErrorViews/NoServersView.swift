//
//  NoServersView.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import SwiftUI

struct NoServersView: View {
  var body: some View {
    VStack (spacing: 8) {
      Text(
        NSLocalizedString("extension.no_servers.title",
          value: "Not connected to any servers",
          comment: ""
        )
      )
      .font(Font.custom("Metropolis-SemiBold", size: 20))
      .foregroundColor(Color.theme.centerChannelColor)
      Text(
        NSLocalizedString("extension.no_servers.description",
          value: "To share content, you'll need to be logged in to a Mattermost server.",
          comment: ""
        )
      )
      .font(Font.custom("OpenSans", size: 16))
      .foregroundColor(Color.theme.centerChannelColor.opacity(0.72))
    }
    .padding(.horizontal, 12)
  }
}
