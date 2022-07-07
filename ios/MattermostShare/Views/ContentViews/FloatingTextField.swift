//
//  FloatingTextField.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import SwiftUI

struct FloatingTextField: View {
  private let placeholderText: String
  
  @EnvironmentObject var shareViewModel: ShareViewModel
  @FocusState private var focusState: Bool
  @State private var isFocused: Bool = false
  @Binding var text: String
  
  public init(placeholderText: String, text: Binding<String>) {
    self._text = text
    self.placeholderText = placeholderText
  }
  
  var shouldPlaceholderMove: Bool {
    isFocused || text.count != 0
  }
  
  var error: Bool {
    text.count > shareViewModel.server!.maxMessageLength
  }
  
  var focusedColor: Color {
    if error {
      return Color.theme.errorTextColor
    }
    return isFocused ? Color.theme.linkColor : Color.theme.centerChannelColor.opacity(0.64)
  }
  
  func formatLength(_ value: Int64) -> String {
    let formatter = NumberFormatter()
    formatter.numberStyle = .decimal
    formatter.maximumFractionDigits = 0
    let number = NSNumber(value: value)
    return formatter.string(from: number)!
  }
  
  var body: some View {
    VStack (alignment: .leading) {
      if (error) {
        ErrorLabelView(
          error: "Message must be less than \(formatLength(shareViewModel.server!.maxMessageLength)) characters"
        )
      }
      ZStack(alignment: .topLeading) {
        TextEditor(text: $text)
          .focused($focusState)
          .onChange(of: focusState, perform: {value in
            withAnimation{
              isFocused = value
            }
          })
          .accentColor(.accentColor)
          .padding(.horizontal, 10)
          .font(Font.custom("OpenSans", size: 16))
          .foregroundColor(Color.theme.centerChannelColor)
          .lineLimit(10)
          .multilineTextAlignment(.leading)
          .frame(minHeight: isFocused ? 104 : nil, alignment: .leading)
          .overlay(
            RoundedRectangle(cornerRadius: 4)
              .stroke(focusedColor, lineWidth: 1)
          )
        Text(placeholderText)
          .foregroundColor(focusedColor)
          .font(
            Font.custom("OpenSans", size: shouldPlaceholderMove ? 10 : 16))
          .padding(
            shouldPlaceholderMove ?
            EdgeInsets(top: 0, leading: 5, bottom: 0, trailing: 5) :
              EdgeInsets(top: 8, leading: 15, bottom: 0, trailing: 0)
          )
          .background(Color(UIColor.systemBackground).opacity(shouldPlaceholderMove ? 1.0 : 0))
          .offset(x: shouldPlaceholderMove ? 10 : 0, y: shouldPlaceholderMove ? -8 : 0)
          .animation(.easeInOut(duration: 0.2), value: shouldPlaceholderMove)
      }
    }
  }
}
