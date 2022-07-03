//
//  CustomAsyncImage.swift
//  SwiftUISample
//
//  Created by Elias Nahum on 21-06-22.
//

import SwiftUI

struct CustomAsyncImage<Content: View, Placeholder: View>: View {
  @EnvironmentObject var shareViewModel: ShareViewModel
  @State var uiImage: UIImage?
  
  let serverUrl: String
  let userId: String
  let content: (Image) -> Content
  let placeholder: () -> Placeholder
  
  init(
    serverUrl: String,
    userId: String,
    @ViewBuilder content: @escaping (Image) -> Content,
    @ViewBuilder placeholder: @escaping () -> Placeholder
  ) {
    self.serverUrl = serverUrl
    self.userId = userId
    self.content = content
    self.placeholder = placeholder
  }
  
  var body: some View {
    if let uiImage = uiImage {
      content(Image(uiImage:  uiImage))
    } else {
      placeholder()
        .task {
          shareViewModel.getProfileImage(serverUrl: self.serverUrl, userId: self.userId, imageBinding: $uiImage)
        }
    }
  }
}
