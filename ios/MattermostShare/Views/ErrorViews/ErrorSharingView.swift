//
//  ErrorSharingView.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import SwiftUI

struct ErrorSharingView: View {
  var error: String
  @State var retrying = false
  
  let onError = NotificationCenter.default.publisher(for: Notification.Name("errorPosting"))
  
  var body: some View {
      VStack (spacing: 8) {
          if retrying {
            ProgressView()
              .onAppear {
                NotificationCenter.default.post(name: Notification.Name("submit"), object: nil, userInfo: nil)
              }
          } else {
              Text(
                NSLocalizedString("share_extension.error_screen.label", value: "An error ocurred", comment: "")
              )
              .font(Font.custom("Metropolis-SemiBold", size: 20))
              .foregroundColor(Color.theme.centerChannelColor)
              Text(
                NSLocalizedString("share_extension.error_screen.description",
                  value: "There was an error when attempting to share the content to {applicationName}.",
                  comment: ""
                )
                .replacingOccurrences(
                  of: "{applicationName}",
                  with: Bundle.main.infoDictionary?["CFBundleDisplayName"] as? String ?? "Mattermost Beta"
                )
              )
              .font(Font.custom("OpenSans", size: 16))
                  .foregroundColor(Color.theme.centerChannelColor.opacity(0.72))
              Text(
                NSLocalizedString("share_extension.error_screen.reason",
                  value: "Reason: {reason}",
                  comment: ""
                )
                .replacingOccurrences(of: "{reason}", with: error)
              )
              .font(Font.custom("OpenSans", size: 12))
              .foregroundColor(Color.theme.centerChannelColor.opacity(0.60))
              Button {
                  retrying = true
              } label: {
                  Text(
                    NSLocalizedString("mobile.post.failed_retry", value: "Try again", comment: "")
                  )
                  .font(Font.custom("OpenSans", size: 16))
                  .foregroundColor(Color.theme.buttonColor)
              }
              .buttonStyle(.borderedProminent)
              .tint(Color.theme.buttonBg)
          }
      }
      .transition(.opacity)
      .animation(.linear(duration: 0.3))
      .padding(.horizontal, 12)
      .onReceive(onError) {_ in
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
          retrying = false
        }
      }
  }
}
