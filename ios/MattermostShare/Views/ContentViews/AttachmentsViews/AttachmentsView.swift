//
//  AttachmentsView.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import SwiftUI

struct AttachmentsView: View {
  @EnvironmentObject var shareViewModel: ShareViewModel
  @Binding var attachments: [AttachmentModel]
  
  var error: String? {
    if let server = shareViewModel.server {
      if server.uploadsDisabled {
        return NSLocalizedString("share_extension.upload_disabled",
          value: "File uploads are disabled for the selected server",
          comment: ""
        )
      }
      let sizeError = attachments.contains { $0.sizeError(server: server)}
      let resolutionError = attachments.contains { $0.resolutionError(server: server)}
      if sizeError && attachments.count == 1 {
        return NSLocalizedString("share_extension.file_limit.single",
          value: "File must be less than {size}",
          comment: ""
        )
        .replacingOccurrences(of: "{size}", with: server.maxFileSize.formattedFileSize)
      } else if sizeError {
        return NSLocalizedString("share_extension.file_limit.multiple",
          value: "Each file must be less than {size}",
          comment: ""
        )
        .replacingOccurrences(of: "{size}", with: server.maxFileSize.formattedFileSize)
      } else if resolutionError {
        return NSLocalizedString("share_extension.max_resolution",
          value: "Image exceeds maximum dimensions of 7680 x 4320 px",
          comment: ""
        )
      }
    }
    
    return nil
  }
  
  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      if (attachments.count == 1) {
        let attachment = attachments[0]
        let isImageType = attachment.type == .image
        
        SingleAttachmentView(
          attachments: $attachments,
          attachment: attachment,
          index: 0,
          hasError: attachment.sizeError(server: shareViewModel.server) ||
          attachment.resolutionError(server: shareViewModel.server),
          isSmall: isImageType
        )
        .padding(.horizontal, 16)
        .transition(.opacity)
      } else {
        MultipleAttachmentView(attachments: $attachments)
          .transition(.opacity)
      }
      
      if error != nil {
        ErrorLabelView(error: error!)
          .padding(.horizontal, 16)
          .padding(.top, 8)
      }
    }
    .animation(.linear(duration: 0.3))
  }
}
