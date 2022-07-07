//
//  ImageThumbnail.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import SwiftUI

struct ImageThumbnail: View {
  var small = false
  var attachment: AttachmentModel
  var hasError: Bool
  
  var body: some View {
    Image(uiImage: UIImage(contentsOfFile: attachment.fileUrl.path)!)
      .resizable()
      .aspectRatio(contentMode: small ? .fill : .fit)
      .frame(width: small ? 104 : nil, height: small ? 104 : 156)
      .cornerRadius(4)
      .background(
        RoundedRectangle(cornerRadius: 4)
          .stroke(
            hasError ? Color.theme.errorTextColor : Color.theme.centerChannelColor.opacity(0.16),
            lineWidth: 1
          )
          .shadow(color: Color(red: 0, green: 0, blue: 0, opacity: 0.08), radius: 3, x: 0, y: 2)
      )
  }
}
