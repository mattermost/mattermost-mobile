//
//  Attachments.swift
//  SwiftUISample
//
//  Created by Elias Nahum on 15-06-22.
//

import SwiftUI

struct AttachmentsView: View {
  @Binding var attachments: [AttachmentModel]
    
  var body: some View {
      VStack {
          if (attachments.count == 1) {
              SingleAttachmentView(attachment: attachments[0])
                  .transition(.opacity)
          } else {
              MultipleAttachmentView(attachments: $attachments)
                  .transition(.opacity)
          }
      }
      .animation(.linear(duration: 0.3))
  }
}
