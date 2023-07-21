//
//  FloatingTextField.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import SwiftUI

struct ViewHeightKey: PreferenceKey {
    static var defaultValue: CGFloat { 0 }
    static func reduce(value: inout Value, nextValue: () -> Value) {
        value = value + nextValue()
    }
}

struct FloatingTextField: View {
  @EnvironmentObject var shareViewModel: ShareViewModel
  
  private let placeholderText: String
  
  @Binding var text: String
  @FocusState private var focusState: Bool
  @State private var isFocused: Bool = false
  @State private var textEditorHeight : CGFloat = 104
  
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
  
  var focusedBorderColor: Color {
    if error {
      return Color.theme.errorTextColor
    }
    return isFocused ? Color.theme.linkColor : Color.theme.centerChannelColor.opacity(0.16)
  }
  
  func formatLength(_ value: Int64) -> String {
    let formatter = NumberFormatter.noFractionDigitsDecimalFormatter
    let number = NSNumber(value: value)
    return formatter.string(from: number)!
  }
  
  var body: some View {
    VStack (alignment: .leading) {
      if (error) {
        ErrorLabelView(
          error: NSLocalizedString("mobile.message_length.message",
            value: "Your current message is too long. Current character count: {count}/{max}",
            comment: ""
          )
          .replacingOccurrences(of: "{count}", with: formatLength(Int64(text.count)))
          .replacingOccurrences(of: "{max}", with: formatLength(shareViewModel.server!.maxMessageLength))
        )
      }
      ZStack(alignment: .topLeading) {
        Text(text)
          .font(Font.custom("OpenSans", size: 16))
          .foregroundColor(.clear)
          .background(GeometryReader {
            Color.clear.preference(key: ViewHeightKey.self, value: $0.frame(in: .local).size.height + 32)
          })
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
          .multilineTextAlignment(.leading)
          .frame(minHeight: 104)
          .frame(maxHeight: isFocused ? 104 : max(104, textEditorHeight), alignment: .leading)
          .overlay(
            RoundedRectangle(cornerRadius: 4)
              .stroke(focusedBorderColor, lineWidth: isFocused ? 2 : 1)
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
      .onPreferenceChange(ViewHeightKey.self) { textEditorHeight = $0 }
    }
  }
}
