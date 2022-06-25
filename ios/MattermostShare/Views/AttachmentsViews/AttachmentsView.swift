//
//  Attachments.swift
//  SwiftUISample
//
//  Created by Elias Nahum on 15-06-22.
//

import SwiftUI

struct AttachmentsView: View {
    var attachments: [AttachmentModel] = []
    
    var body: some View {
      if (attachments.count == 1 && attachments[0].type != .file) {
            SingleAttachmentView(attachment: attachments[0])
        } else {
            VStack(alignment: .leading) {
                AttachmentInfoView(
                    attachment: attachments[0],
                    hasMultiple: attachments.count > 1
                )

                if (attachments.count > 1) {
                    Text("\(attachments.count) attachments")
                        .foregroundColor(Color.theme.centerChannelColor.opacity(0.64))
                        .font(Font.custom("OpenSans", size: 12))
                        .padding(.top, 12)
                        .padding(.horizontal)
                }
            }
        }
    }
}
