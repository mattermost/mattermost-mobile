//
//  SearchBarView.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import SwiftUI

struct SearchBarView: View {
  @EnvironmentObject var shareViewModel: ShareViewModel
  @State private var isEditing: Bool = false
  
  var body: some View {
    HStack {
      TextField("", text: $shareViewModel.search)
        .placeholder(when: shareViewModel.search.isEmpty) {
          Text(
            NSLocalizedString("channel_list.find_channels", value: "Find channels...", comment: "")
          )
          .foregroundColor(Color.theme.centerChannelColor.opacity(0.64))
        }
        .padding(.leading, 40)
        .padding(.trailing, 30)
        .frame(height: 40)
        .background(
          RoundedRectangle(cornerRadius: 8)
            .fill(Color.theme.centerChannelColor.opacity(0.08))
        )
        .foregroundColor(Color.theme.centerChannelColor)
        .overlay(
          HStack {
            Image(systemName: "magnifyingglass")
              .foregroundColor(
                shareViewModel.search.isEmpty ?
                Color.theme.centerChannelColor.opacity(0.64) :
                  Color.theme.centerChannelColor
              )
              .frame(minWidth: 0, maxWidth: .infinity, alignment: .leading)
              .padding(.leading, 12)
            
            if isEditing && shareViewModel.search.count != 0 {
              Button(action: {
                shareViewModel.search = ""
              }) {
                Image(systemName: "multiply.circle.fill")
                  .foregroundColor(Color.theme.centerChannelColor.opacity(0.56))
                  .padding(.leading, 10)
                  .padding(.trailing, 7.5)
                  .padding(.vertical, 10)
              }
            }
          }
        )
        .onTapGesture {
          withAnimation(.linear(duration: 0.15)) {
            isEditing = true
          }
        }
      
      if isEditing {
        Button(action: dismissKeyboard) {
          Text(
            NSLocalizedString("mobile.post.cancel", value: "Cancel", comment: "")
          )
          .foregroundColor(Color.theme.centerChannelColor)
          .font(Font.custom("OpenSans", size: 14))
        }
        .transition(.move(edge: .trailing))
        .animation(.linear(duration: 0.15))
      }
    }
    .font(Font.custom("OpenSans", size: 16))
  }
  
  func dismissKeyboard() {
    withAnimation{
      shareViewModel.search = ""
      isEditing = false
    }
    
    NotificationCenter.default.post(name: Notification.Name("dismissKeyboard"), object: nil)
  }
}
