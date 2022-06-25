//
//  AttachmentThumbnailView.swift
//  SwiftUISample
//
//  Created by Elias Nahum on 23-06-22.
//

import SwiftUI

struct AttachmentThumbnailView: View {
    var attachment: AttachmentModel
    var body: some View {
        switch (attachment.type) {
        case .image:
            Image(uiImage: UIImage(contentsOfFile: attachment.fileUrl.path)!)
                .resizable()
                .frame(width: 40, height: 40)
                .scaledToFill()
                .cornerRadius(4)
                .overlay(
                    RoundedRectangle(cornerRadius: 4)
                        .stroke(Color.theme.centerChannelColor.opacity(0.16), lineWidth: 1)
                        .shadow(color: Color(red: 0, green: 0, blue: 0, opacity: 0.08), radius: 3, x: 0, y: 2)
                )
            .padding(.trailing, 6)

        case .video:
            VideoThumbnail(small: true, attachment: attachment)
                .frame(width: 40, height: 40)
        case .file:
            FontIcon.text(
                .compassIcons(code: .genericFile),
                fontsize: 48,
                color: Color.gray)
        }
    }
}
