//
//  InitialView.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import SwiftUI

struct InitialView: View {
  @EnvironmentObject var shareViewModel: ShareViewModel

  @Binding var attachments: [AttachmentModel]
  @Binding var linkPreviewUrl: String
  @Binding var message: String
  @State var error: String?

  let onError = NotificationCenter.default.publisher(for: Notification.Name("errorPosting"))

  var noServers: Bool {
    shareViewModel.allServers.count == 0
  }

  var onlyZeroPersistenceServers: Bool {
    !shareViewModel.allServers.isEmpty && shareViewModel.server == nil
  }

  var noChannels: Bool {
    shareViewModel.allServers.allSatisfy({!$0.hasChannels})
  }

  init(attachments: Binding<[AttachmentModel]>,
       linkPreviewUrl: Binding<String>,
       message: Binding<String>
  ) {
    let appearance = UINavigationBarAppearance()
    appearance.configureWithTransparentBackground()

    appearance.titleTextAttributes = [.foregroundColor: UIColor(.white), .font: UIFont(name: "Metropolis-SemiBold", size: 18) as Any]
    appearance.backgroundColor = UIColor(Color.theme.sidebarBg)
    UINavigationBar.appearance().standardAppearance = appearance
    UINavigationBar.appearance().scrollEdgeAppearance = appearance
    UINavigationBar.appearance().tintColor = UIColor(Color.theme.sidebarText)
    self._attachments = attachments
    self._linkPreviewUrl = linkPreviewUrl
    self._message = message
  }

  var body: some View {
    return VStack {
      if error != nil {
        ErrorSharingView(error: error!)
          .transition(.opacity)
      } else if noServers {
        NoServersView()
      } else if onlyZeroPersistenceServers {
        VStack(spacing: 8) {
          Text(NSLocalizedString("extension.zero_persistence_servers.title",
            value: "Sharing unavailable",
            comment: ""
          ))
          .font(Font.custom("Metropolis-SemiBold", size: 20))
          .foregroundColor(Color.theme.centerChannelColor)
          Text(NSLocalizedString("extension.zero_persistence_servers.description",
            value: "Sharing is unavailable because this server is configured in zero persistence mode.",
            comment: ""
          ))
          .font(Font.custom("OpenSans", size: 16))
          .foregroundColor(Color.theme.centerChannelColor.opacity(0.72))
          .multilineTextAlignment(.center)
        }
        .padding(.horizontal, 12)
      } else if noChannels {
        NoMembershipView()
      } else {
        ContentView(
          attachments: $attachments,
          linkPreviewUrl: $linkPreviewUrl,
          message: $message
        )
      }
    }
    .accentColor(.white)
    .navigationBarTitle(
      NSLocalizedString("share_extension.share_screen.title",
        value: "Share to {applicationName}",
        comment: ""
      )
      .replacingOccurrences(
        of: "{applicationName}",
        with: Bundle.main.infoDictionary?["CFBundleDisplayName"] as? String ?? "Mattermost Beta"
      ),
      displayMode: .inline
    )
    .navigationBarItems(
      leading: CancelButton(attachments: attachments),
      trailing: PostButton(
        attachments: $attachments,
        linkPreviewUrl: linkPreviewUrl,
        message: $message
      )
    )
    .padding(20)
    .animation(.linear(duration: 0.3))
    .onReceive(onError) {obj in
      if let userInfo = obj.userInfo, let info = userInfo["info"] as? String {
        error = info
      }
    }
  }
}
