//
//  SingleAttachmentView.swift
//  SwiftUISample
//
//  Created by Elias Nahum on 23-06-22.
//

import SwiftUI

struct SingleAttachmentView: View {
    var attachment: AttachmentModel
    var body: some View {
        if (attachment.type == .image) {
            Image(uiImage: UIImage(contentsOfFile: attachment.fileUrl.path)!)
                .resizable()
                .aspectRatio(contentMode: .fit)
                .cornerRadius(4)
                .frame(maxHeight: 156)
            .overlay(
                RoundedRectangle(cornerRadius: 4)
                    .stroke(Color.theme.centerChannelColor.opacity(0.16), lineWidth: 1)
                    .shadow(color: Color(red: 0, green: 0, blue: 0, opacity: 0.08), radius: 3, x: 0, y: 2)
            )
        } else if (attachment.type == .video) {
            VideoThumbnail(attachment: attachment)
        }
    }
}
