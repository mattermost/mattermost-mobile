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
    VStack (alignment: .leading, spacing: 4) {
      ScrollView (.horizontal, showsIndicators: true) {
        HStack(spacing: 8) {
          ForEach(attachments.indices, id: \.self) { index in
            let attachment = attachments[index]
            let hasError = attachment.sizeError(server: shareViewModel.server) || attachment.resolutionError(server: shareViewModel.server)
            let isFirst = index == 0
            let isLast = index == attachments.count - 1
            
            SingleAttachmentView(
              attachments: $attachments,
              attachment: attachment,
              index: index,
              hasError: hasError,
              isSmall: true
            )
            .padding(.top, 8)
            .padding(.trailing, 8)
            .padding(.leading, isFirst ? 16 : 0)
            .padding(.trailing, isLast ? 16 : 0)
          }
        }
        .frame(height: 80)
      }
      
      if (attachments.count > 1) {
        Text(
          NSLocalizedString("share_extension.multiple_label",
            value: "{count, number} attachments",
            comment: ""
          )
          .replacingOccurrences(of: "{count, number}", with: "\(attachments.count)")
        )
        .foregroundColor(Color.theme.centerChannelColor.opacity(0.64))
        .font(Font.custom("OpenSans", size: 12))
        .padding(.leading, 16)
        .padding(.top, 4)
      }
    }
  }
}
