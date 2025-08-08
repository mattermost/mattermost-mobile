//
//  SingleAttachmentView.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import SwiftUI

struct SingleAttachmentView: View {
  @Binding var attachments: [AttachmentModel]
  var attachment: AttachmentModel
  var index: Int
  var hasError: Bool
  var isSmall: Bool = false
  
  var body: some View {
    ZStack {
      Group {
        if attachment.type == .image {
          ImageThumbnail(
            small: isSmall,
            attachment: attachment,
            hasError: hasError
          )
        } else if attachment.type == .video {
          VideoThumbnail(
            small: isSmall,
            attachment: attachment,
            hasError: hasError
          )
        } else {
          if isSmall {
            FileThumbnail(
              small: true,
              attachment: attachment,
              hasError: hasError
            )
          } else {
            AttachmentInfoView(
              attachment: attachment,
              hasError: hasError,
              fullWidth: true
            )
          }
        }
      }
      
      if isSmall && attachments.count > 1 {
        VStack {
          HStack {
            Spacer()
            RemoveAttachmentView(attachments: $attachments, index: index)
              .offset(x: 8, y: -8)
          }
          Spacer()
        }
      }
    }
  }
}
