//
//  ErrorLabelView.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import SwiftUI

struct ErrorLabelView: View {
  var error: String = ""
  var body: some View {
    HStack (alignment: .top, spacing: 7) {
      FontIcon.text(
        .compassIcons(code: .alert),
        fontsize: 14,
        color: Color.theme.errorTextColor
      )
      Text(error)
        .font(Font.custom("OpenSans", size: 12))
        .foregroundColor(Color.theme.errorTextColor)
      Spacer()
    }
  }
}
