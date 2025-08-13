//
//  RemoveAttachmentView.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import SwiftUI

struct RemoveAttachmentView: View {
  @Binding var attachments: [AttachmentModel]
  var index: Int
  
  func removeAtIndex(_ index: Int) {
    attachments.remove(at: index)
  }
  
  var body: some View {
    // X button styled like Android RemoveButton
    FontIcon.button(
      .compassIcons(code: .closeCircle),
      action: {
        withAnimation {
          removeAtIndex(index)
        }
      },
      fontsize: 24,
      color: Color.theme.centerChannelColor.opacity(0.64)
    )
    .frame(width: 24, height: 24)
    .background(Color.theme.centerChannelBg)
    .cornerRadius(12)
    .shadow(color: Color(red: 0, green: 0, blue: 0, opacity: 0.08), radius: 2, x: 0, y: 1)
  }
}
