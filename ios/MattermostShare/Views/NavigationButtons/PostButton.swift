//
//  PostButton.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import SwiftUI

struct PostButton: View {
  @EnvironmentObject var shareViewModel: ShareViewModel
  @Binding var attachments: [AttachmentModel]
  var linkPreviewUrl: String
  @Binding var message: String
  @State var pressed: Bool = false
  
  let submitPublisher = NotificationCenter.default.publisher(for: Notification.Name("submit"))
  
  func submit() {
    let userInfo: [String: Any] = [
      "serverUrl": shareViewModel.server?.url as Any,
      "channelId": shareViewModel.channel?.id as Any,
      "attachments": attachments,
      "linkPreviewUrl": linkPreviewUrl,
      "message": message,
    ]
    pressed = true
    NotificationCenter.default.post(name: Notification.Name("doPost"), object: nil, userInfo: userInfo)
  }
  
  var body: some View {
    let disabled =
    shareViewModel.server == nil ||
    shareViewModel.channel == nil ||
    shareViewModel.allServers.count == 0 ||
    !shareViewModel.server!.hasChannels ||
    (message.isEmpty && linkPreviewUrl.isEmpty && attachments.isEmpty) ||
    message.count > shareViewModel.server!.maxMessageLength ||
    (attachments.count > 0 && shareViewModel.server!.uploadsDisabled) ||
    attachments.contains {
      ($0.imagePixels ?? 0 > shareViewModel.server!.maxImageResolution) ||
      ($0.fileSize > shareViewModel.server!.maxFileSize)
    }
    
    FontIcon.button(
      .compassIcons(code: .send),
      action: submit,
      fontsize: 24,
      color: disabled || pressed ? .white.opacity(0.16) : .white
    )
    .padding(.leading, 10)
    .padding(.vertical, 5)
    .disabled(disabled || pressed)
    .onReceive(submitPublisher) {_ in
      submit()
    }
  }
}
