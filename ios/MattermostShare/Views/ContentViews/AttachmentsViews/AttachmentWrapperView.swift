//
//  AttachmentWrapperView.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import SwiftUI

struct AttachmentWrapperView<Content: View>: View {
  var content: () -> Content
  var body: some View {
    HStack(spacing: 0) {
      Color.clear.frame(width: 1, height: 100)
      content()
      Color.clear.frame(width: 1, height: 100)
    }
  }
}
