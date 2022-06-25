//
//  ContentView.swift
//  SwiftUISample
//
//  Created by Elias Nahum on 13-06-22.
//

import SwiftUI
import Gekidou

struct ContentView: View {
  @EnvironmentObject var shareViewModel: ShareViewModel
  @State private var message: String = ""
  
  var attachments: [AttachmentModel] = []
  var linkPreviewUrl: String?
  
  init(attachments: [AttachmentModel], linkPreviewUrl: String?, message: String = "") {
    self.attachments = attachments
    self.linkPreviewUrl = linkPreviewUrl
    _message = State(initialValue: message)
  }
  
  var body: some View {
    let appearance = UINavigationBarAppearance()
    appearance.configureWithTransparentBackground()
    
    appearance.titleTextAttributes = [.foregroundColor: UIColor(.white), .font: UIFont(name: "Metropolis-SemiBold", size: 18) as Any]
    appearance.backgroundColor = UIColor(Color.theme.sidebarBg)
    UINavigationBar.appearance().standardAppearance = appearance
    UINavigationBar.appearance().compactAppearance = appearance
    UINavigationBar.appearance().scrollEdgeAppearance = appearance
    UINavigationBar.appearance().tintColor = UIColor(Color.theme.sidebarText)
    let showOptions = shareViewModel.channel != nil
    && !shareViewModel.channel!.id.isEmpty
    
    return VStack {
      if (linkPreviewUrl != nil) {
        LinkPreview(link: linkPreviewUrl!)
          .padding(.top)
          .padding(.horizontal)
      }
      
      if (!attachments.isEmpty) {
        AttachmentsView(attachments: attachments)
          .padding(.top)
          .padding(.horizontal)
      }
      
      if (linkPreviewUrl != nil || !attachments.isEmpty) {
        Divider()
          .padding(.top, 10)
          .padding(.horizontal)
      }
      
      if (showOptions) {
        VStack {
          OptionView(navigationTitle: "Select server", label: "Server", value: shareViewModel.server!.displayName) {
            ServerListView()
          }
          OptionView(navigationTitle: "Select channel", label: "Channel", value: "\(shareViewModel.channel!.displayName) \(shareViewModel.channel!.formattedTeamName)") {
            ChannelListView()
          }
        }
        .padding(.all, 0)
      }
      
      Divider()
        .padding(.bottom, 10)
        .padding(.horizontal)
      
      FloatingTextField(placeholderText: "Enter a message (optional)", text: $message)
        .padding(.horizontal)
      
      Spacer()
    }
    .accentColor(.white)
    .navigationBarTitle("Share to Mattermost", displayMode: .inline)
    .navigationBarItems(
      leading: CancelButton(attachments: attachments),
      trailing: PostButton(
        attachments: attachments,
        linkPreviewUrl: linkPreviewUrl ?? "",
        message: $message
      )
    )
  }
}

struct CancelButton: View {
  var attachments: [AttachmentModel]
  @State var pressed: Bool = false

  func close() {
    let userInfo: [String: Any] = [
      "attachments": attachments
    ]
    pressed = true
    NotificationCenter.default.post(name: Notification.Name("close"), object: nil, userInfo: userInfo)
  }
  
  var body: some View {
    FontIcon.button(
      .compassIcons(code: .close),
      action: close,
      fontsize: 24,
      color: .white
    )
    .padding(.trailing, 10)
    .padding(.vertical, 5)
    .disabled(pressed)
  }
}

struct PostButton: View {
  @EnvironmentObject var shareViewModel: ShareViewModel
  var attachments: [AttachmentModel]
  var linkPreviewUrl: String
  @Binding var message: String
  @State var pressed: Bool = false
  
  func submit() {
    let userInfo: [String: Any] = [
      "serverUrl": shareViewModel.server?.url as Any,
      "channelId": shareViewModel.channel?.id as Any,
      "attachments": attachments,
      "linkPreviewUrl": linkPreviewUrl,
      "message": message,
    ]
    pressed = true
    NotificationCenter.default.post(name: Notification.Name("doPost"), object: nil, userInfo: userInfo)
  }
  
  var body: some View {
    let disabled = (
      message.isEmpty &&
      linkPreviewUrl.isEmpty &&
      attachments.isEmpty
    ) ||
    shareViewModel.server == nil ||
    shareViewModel.channel == nil
    
    FontIcon.button(
      .compassIcons(code: .send),
      action: submit,
      fontsize: 24,
      color: disabled || pressed ? .white.opacity(0.16) : .white
    )
    .padding(.leading, 10)
    .padding(.vertical, 5)
    .disabled(disabled || pressed)
  }
}
