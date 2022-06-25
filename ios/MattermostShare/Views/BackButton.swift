//
//  BackButton.swift
//  SwiftUISample
//
//  Created by Elias Nahum on 20-06-22.
//

import SwiftUI

struct BackButton: View {
  @Environment(\.presentationMode) var presentationMode: Binding<PresentationMode>
  
  var body: some View {
    FontIcon.button(
      .compassIcons(code: .back),
      action: {
        self.presentationMode.wrappedValue.dismiss()
      },
      fontsize: 24,
      color: Color.theme.sidebarText
    )
    .padding(.trailing, 10)
    .padding(.vertical, 5)
  }
}
