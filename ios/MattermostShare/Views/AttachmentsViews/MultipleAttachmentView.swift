//
//  MultipleAttachmentView.swift
//  MattermostShare
//
//  Created by Elias Nahum on 01-07-22.
//  Copyright © 2022 Facebook. All rights reserved.
//

import SwiftUI

struct MultipleAttachmentView: View {
    @Binding var attachments: [AttachmentModel]
    
    var body: some View {
        VStack (alignment: .leading) {
            ScrollView (.horizontal, showsIndicators: true) {
                HStack(spacing: 12) {
                    ForEach(attachments.indices, id: \.self) { index in
                        let attachment = attachments[index]
                        VStack {
                            if attachment.type == .image {
                                Image(uiImage: UIImage(contentsOfFile: attachment.fileUrl.path)!)
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                                    .frame(width: 104, height: 104)
                                    .cornerRadius(4)
                                .background(
                                    RoundedRectangle(cornerRadius: 4)
                                        .stroke(Color.theme.centerChannelColor.opacity(0.16), lineWidth: 1)
                                        .shadow(color: Color(red: 0, green: 0, blue: 0, opacity: 0.08), radius: 3, x: 0, y: 2)
                                )
                            } else if attachment.type == .video {
                                VideoThumbnail(
                                    small: true,
                                    attachment: attachment
                                )
                            } else if attachment.type == .file {
                                VStack {
                                    attachment.icon()
                                    Text(attachment.fileName)
                                        .foregroundColor(Color.theme.centerChannelColor)
                                        .lineLimit(1)
                                        .font(Font.custom("OpenSans-SemiBold", size: 10))
                                        .padding(.horizontal, 4)
                                    Text("\(attachment.fileUrl.pathExtension.uppercased()) \(attachment.formattedFileSize)")
                                        .foregroundColor(Color.theme.centerChannelColor.opacity(0.64))
                                        .lineLimit(1)
                                        .font(Font.custom("OpenSans", size: 12))
                                }
                                .background(
                                    RoundedRectangle(cornerRadius: 4)
                                        .stroke(Color.theme.centerChannelColor.opacity(0.16), lineWidth: 1)
                                        .shadow(color: Color(red: 0, green: 0, blue: 0, opacity: 0.08), radius: 3, x: 0, y: 2)
                                        .frame(width: 104, height: 104)
                                )
                                .frame(width: 104, height: 104)
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
