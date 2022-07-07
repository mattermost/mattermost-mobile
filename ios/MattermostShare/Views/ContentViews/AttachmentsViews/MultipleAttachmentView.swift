//
//  MultipleAttachmentView.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import SwiftUI

struct MultipleAttachmentView: View {
  @EnvironmentObject var shareViewModel: ShareViewModel
  @Binding var attachments: [AttachmentModel]
  
  var body: some View {
    VStack (alignment: .leading) {
      ScrollView (.horizontal, showsIndicators: true) {
        HStack(spacing: 12) {
          ForEach(attachments.indices, id: \.self) { index in
            let attachment = attachments[index]
            let hasError = attachment.sizeError(server: shareViewModel.server) || attachment.resolutionError(server: shareViewModel.server)
            VStack {
              if attachment.type == .image {
                AttachmentWrapperView {
                  ImageThumbnail(
                    small: true,
                    attachment: attachment,
                    hasError: hasError
                  )
                }
              } else if attachment.type == .video {
                AttachmentWrapperView {
                  VideoThumbnail(
                    small: true,
                    attachment: attachment,
                    hasError: hasError
                  )
                }
              } else if attachment.type == .file {
                AttachmentWrapperView {
                  FileThumbnail(
                    attachment: attachment,
                    hasError: hasError
                  )
                }
              }
            }
            .overlay(
              RemoveAttachmentView(attachments: $attachments, index: index),
              alignment: .topTrailing
            )
          }
        }
        .frame(height: 116)
      }
      
      if (attachments.count > 1) {
        Text("\(attachments.count) attachments")
          .foregroundColor(Color.theme.centerChannelColor.opacity(0.64))
          .font(Font.custom("OpenSans", size: 12))
      }
    }
  }
}
