//
//  AttachmentInfoView.swift
//  SwiftUISample
//
//  Created by Elias Nahum on 23-06-22.
//

import SwiftUI

struct AttachmentInfoView: View {
    var attachment: AttachmentModel
    var hasMultiple: Bool
    
    var body: some View {
        HStack {
            AttachmentThumbnailView(attachment: attachment)
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
        .frame(minWidth: 0,
                maxWidth: .infinity,
                minHeight: 0,
                maxHeight: 64,
                alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 4)
                .stroke(Color.theme.centerChannelColor.opacity(0.16), lineWidth: 1)
                .shadow(color: Color(red: 0, green: 0, blue: 0, opacity: 0.08), radius: 3, x: 0, y: 2)
                .background(.background)
                .background(
                    HalfRounded(shouldShow: hasMultiple)
                )
        )
    }
}

struct HalfRounded: View {
    var shouldShow: Bool
    var body: some View {
        if (shouldShow) {
            RoundedRectangle(cornerRadius: 4)
                .trim(from: 0.0, to: 0.5)
                .offset(x: 0, y: 6)
                .stroke(Color.theme.centerChannelColor.opacity(0.16), lineWidth: 1)
                .shadow(color: Color(red: 0, green: 0, blue: 0, opacity: 0.08), radius: 3, x: 0, y: 2)
                .padding(.horizontal, 6)
        } else {
            EmptyView()
        }
    }
}
