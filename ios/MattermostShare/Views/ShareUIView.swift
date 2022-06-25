//
//  ShareUIView.swift
//  MattermostShare
//
//  Created by Elias Nahum on 12-06-22.
//  Copyright © 2022 Facebook. All rights reserved.
//

import SwiftUI

struct ShareUIView: View {
  @StateObject var shareViewModel = ShareViewModel()
  var attachments: [AttachmentModel] = []
  var linkPreviewUrl: String?
  var message: String?
  
  var body: some View {
    NavigationView {
      ContentView(
        attachments: attachments,
        linkPreviewUrl: linkPreviewUrl,
        message: message ?? ""
      )
    }
    .navigationViewStyle(StackNavigationViewStyle())
    .padding(0)
    .environmentObject(shareViewModel)
  }
}

struct ShareUIView_Previews: PreviewProvider {
    static var previews: some View {
        ShareUIView()
    }
}
