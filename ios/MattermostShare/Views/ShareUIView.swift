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
  @State var attachments: [AttachmentModel] = []
  @State var linkPreviewUrl: String = ""
  @State var message: String = ""
  
  var body: some View {
    NavigationView {
      ContentView(
        attachments: $attachments,
        linkPreviewUrl: $linkPreviewUrl,
        message: $message
      )
    }
    .navigationViewStyle(StackNavigationViewStyle())
    .environmentObject(shareViewModel)
  }
}
