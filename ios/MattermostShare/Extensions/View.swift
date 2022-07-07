//
//  View.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import Foundation
import SwiftUI
import Combine

struct KeyboardAdaptive: ViewModifier {
  @State private var keyboardHeight: CGFloat = 0
  
  func body(content: Content) -> some View {
    content
      .padding(.bottom, keyboardHeight)
      .onReceive(Publishers.keyboardHeight) { self.keyboardHeight = $0 / 3 }
  }
}

extension View {
  func placeholder<Content: View>(when shouldShow: Bool, alignment: Alignment = .leading, @ViewBuilder placeholder: () -> Content) -> some View {
    ZStack(alignment: alignment) {
      placeholder().opacity(shouldShow ? 1 : 0)
      self
    }
  }
  
  func keyboardAdaptive() -> some View {
    ModifiedContent(content: self, modifier: KeyboardAdaptive())
  }
}
