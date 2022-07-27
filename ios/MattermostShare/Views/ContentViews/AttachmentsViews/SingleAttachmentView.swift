//
//  SingleAttachmentView.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import SwiftUI

struct SingleAttachmentView: View {
  var attachment: AttachmentModel
  var hasError: Bool
  
  var body: some View {
    if (attachment.type == .image) {
      ImageThumbnail(
        attachment: attachment,
        hasError: hasError
      )
    } else if (attachment.type == .video) {
      VideoThumbnail(
        attachment: attachment,
        hasError: hasError
      )
    } else {
      AttachmentInfoView(
        attachment: attachment,
        hasError: hasError
      )
    }
  }
}
