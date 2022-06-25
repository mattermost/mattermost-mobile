//
//  CustomAsyncImage.swift
//  SwiftUISample
//
//  Created by Elias Nahum on 21-06-22.
//

import Gekidou
import SwiftUI

let token = "zp6ojkkgy3b18q1d9tfx8escth"

func getProfileImage(serverUrl: String, userId: String, imageBinding: Binding<UIImage?>) {
  if let image = LocalFileManager.instance.getProfileImage(userId: userId) {
    imageBinding.wrappedValue = image
  } else {
    downloadProfileImage(serverUrl: serverUrl, userId: userId, imageBinding: imageBinding)
  }
}

func downloadProfileImage(serverUrl: String, userId: String, imageBinding: Binding<UIImage?>) {
  guard let _ = URL(string: serverUrl) else {
      fatalError("Missing or Malformed URL")
  }

  Gekidou.Network.default.fetchUserProfilePicture(userId: userId, withServerUrl: serverUrl, completionHandler: {data, response, error in
    guard (response as? HTTPURLResponse)?.statusCode == 200 else {
        fatalError("Error while fetching image \(String(describing: (response as? HTTPURLResponse)?.statusCode))")
    }
    
    if let data = data {
      let image = UIImage(data: data)
      imageBinding.wrappedValue = image
      if let img = image {
        LocalFileManager.instance.saveProfileImage(image: img, userId: userId)
      }
    }
  })
}

struct CustomAsyncImage<Content: View, Placeholder: View>: View {
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
                  getProfileImage(serverUrl: self.serverUrl, userId: self.userId, imageBinding: $uiImage)
                }
        }
    }
}
