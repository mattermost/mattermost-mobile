//
//  CancelButton.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import SwiftUI

struct CancelButton: View {
  var attachments: [AttachmentModel]
  @State var pressed: Bool = false
  
  func close() {
    let userInfo: [String: Any] = [
      "attachments": attachments
    ]
    pressed = true
    NotificationCenter.default.post(name: Notification.Name("close"), object: nil, userInfo: userInfo)
  }
  
  var body: some View {
    FontIcon.button(
      .compassIcons(code: .close),
      action: close,
      fontsize: 24,
      color: .white
    )
    .padding(.trailing, 10)
    .padding(.vertical, 5)
    .disabled(pressed)
  }
}
