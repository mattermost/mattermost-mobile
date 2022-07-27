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
    if attachments.count > 1 {
      FontIcon.button(
        .compassIcons(code: .closeCircle),
        action: {
          withAnimation {
            removeAtIndex(index)
          }
        },
        fontsize: 24,
        color: Color.theme.centerChannelColor.opacity(0.56)
      )
      .background(.background)
      .cornerRadius(12)
      .offset(x: 5, y: -7)
    }
  }
}
