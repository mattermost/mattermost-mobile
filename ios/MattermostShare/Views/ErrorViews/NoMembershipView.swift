//
//  NoMembershipView.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import SwiftUI

struct NoMembershipView: View {
  var body: some View {
    VStack (spacing: 8) {
      Text("Not a member of any team yet")
        .font(Font.custom("Metropolis-SemiBold", size: 20))
        .foregroundColor(Color.theme.centerChannelColor)
      Text("To share content, you'll need to be a member of a team on a Mattermost server.")
        .font(Font.custom("OpenSans", size: 16))
        .foregroundColor(Color.theme.centerChannelColor.opacity(0.72))
    }
    .padding(.horizontal, 12)
  }
}
