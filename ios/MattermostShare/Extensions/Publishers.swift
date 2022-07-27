//
//  Publishers.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import Foundation
import Combine
import SwiftUI

extension Publishers {
  static var keyboardHeight: AnyPublisher<CGFloat, Never> {
    let willShow = NotificationCenter.default
      .publisher(for: UIResponder.keyboardWillShowNotification)
      .compactMap { $0.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect }
      .map { $0.height }
    
    let willHide = NotificationCenter.default
      .publisher(for: UIResponder.keyboardWillHideNotification)
      .map { _ in CGFloat(0) }
    
    return Merge(willShow, willHide)
      .eraseToAnyPublisher()
  }
}
