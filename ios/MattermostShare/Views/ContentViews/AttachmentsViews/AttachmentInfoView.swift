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
  var fullWidth: Bool = false
  
  var body: some View {
    HStack(spacing: 12) {
      VStack {
        attachment.icon()
      }
      .frame(width: 48, height: 48)
      .background(Color.clear)
      
      VStack(alignment: .leading, spacing: 2) {
        Text(attachment.fileName)
          .foregroundColor(Color.theme.centerChannelColor)
          .lineLimit(1)
          .font(Font.custom("OpenSans-SemiBold", size: 16))
          .frame(maxWidth: .infinity, alignment: .leading)
        
        Text("\(attachment.fileUrl.pathExtension.uppercased()) \(attachment.formattedFileSize)")
          .foregroundColor(Color.theme.centerChannelColor.opacity(0.64))
          .lineLimit(1)
          .font(Font.custom("OpenSans", size: 12))
          .frame(maxWidth: .infinity, alignment: .leading)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      
      Spacer(minLength: 0)
    }
    .padding(.leading, 12)
    .padding(.trailing, 16)
    .padding(.vertical, 12)
    .frame(height: 64)
    .frame(maxWidth: fullWidth ? .infinity : 240)
    .background(Color.theme.centerChannelBg)
    .overlay(
      RoundedRectangle(cornerRadius: 4)
        .stroke(
          hasError ? Color.theme.errorTextColor : Color.theme.centerChannelColor.opacity(0.16),
          lineWidth: 1
        )
    )
    .cornerRadius(4)
    .shadow(color: Color(red: 0, green: 0, blue: 0, opacity: 0.08), radius: 3, x: 0, y: 2)
  }
}
