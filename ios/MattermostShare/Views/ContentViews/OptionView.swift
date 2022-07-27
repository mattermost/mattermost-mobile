//
//  OptionView.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import SwiftUI

struct OptionView<Content: View>: View {
  var navigationTitle: String
  var label: String
  var value: String
  @ViewBuilder let content: Content
  
  var body: some View {
    NavigationLink {
      content
        .navigationTitle(navigationTitle)
        .navigationBarBackButtonHidden(true)
        .navigationBarItems(leading: BackButton())
        .accentColor(.white)
    } label: {
      HStack {
        Text(label)
          .foregroundColor(Color.theme.centerChannelColor)
          .font(Font.custom("OpenSans", size: 16))
        Spacer()
        Text(value)
          .foregroundColor(Color.theme.centerChannelColor.opacity(0.56))
          .font(Font.custom("OpenSans", size: 14))
          .lineLimit(1)
        Image(systemName: "chevron.right")
          .foregroundColor(Color.theme.centerChannelColor.opacity(0.56))
          .font(.caption)
      }
      .padding(.vertical)
    }
  }
}
