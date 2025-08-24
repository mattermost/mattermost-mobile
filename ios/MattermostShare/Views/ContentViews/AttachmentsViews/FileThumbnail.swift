//
//  FileThumbnail.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.//

import SwiftUI

struct FileThumbnail: View {
  var small = false
  var attachment: AttachmentModel
  var hasError: Bool
  
  var body: some View {
    if small {
      // Small mode: Use AttachmentInfoView with fixed width
      AttachmentInfoView(
        attachment: attachment,
        hasError: hasError,
        fullWidth: false
      )
    } else {
      // Full mode: Use AttachmentInfoView with full width
      AttachmentInfoView(
        attachment: attachment,
        hasError: hasError,
        fullWidth: true
      )
    }
  }
}
