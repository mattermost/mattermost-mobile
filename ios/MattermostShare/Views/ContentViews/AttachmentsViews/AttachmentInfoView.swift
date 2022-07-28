//
//  AttachmentInfoView.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import SwiftUI

struct AttachmentInfoView: View {
  var attachment: AttachmentModel
  var hasError: Bool
  
  var body: some View {
    HStack {
      attachment.icon()
      VStack(alignment: .leading) {
        Text(attachment.fileName)
          .foregroundColor(Color.theme.centerChannelColor)
          .lineLimit(1)
          .font(Font.custom("OpenSans-SemiBold", size: 16))
        Text("\(attachment.fileUrl.pathExtension.uppercased()) \(attachment.formattedFileSize)")
          .foregroundColor(Color.theme.centerChannelColor.opacity(0.64))
          .lineLimit(1)
          .font(Font.custom("OpenSans", size: 12))
      }
    }
    .padding(.all, 12)
    .frame(height: 64, alignment: .leading)
    .frame(minWidth: 0, maxWidth: .infinity, maxHeight: 64, alignment: .leading)
    .background(
      RoundedRectangle(cornerRadius: 4)
        .stroke(
          hasError ? Color.theme.errorTextColor : Color.theme.centerChannelColor.opacity(0.16),
          lineWidth: 1
        )
        .shadow(color: Color(red: 0, green: 0, blue: 0, opacity: 0.08), radius: 3, x: 0, y: 2)
        .background(.background)
    )
  }
}
