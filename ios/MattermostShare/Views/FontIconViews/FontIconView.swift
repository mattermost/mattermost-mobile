//
//  FontIconView.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

#if canImport(UIKit)
import UIKit
#endif
#if canImport(AppKit)
import AppKit
#endif

import Foundation
import SwiftUI

public class FontIcon {
  public static func text(_ fontCode: FontCode, fontsize: CGFloat = 20, color: Color? = nil) -> Text {
    var shouldLoadFont = false
    shouldLoadFont = UIFont(name: fontCode.fontFamilyName, size: fontsize) == nil
    if shouldLoadFont {
      FontLoader.loadFont(fontCode)
    }
    let text = Text(fontCode.code).font(.custom(fontCode.fontFamilyName, size: fontsize))
    
    return color == nil ? text : text.foregroundColor(color!)
  }
  
  public static func button(_ fontCode: FontCode, action: @escaping () -> Void, padding: CGFloat = 0, fontsize: CGFloat = 20, color: Color? = nil) -> some View {
    return button(fontCode, action: action, padding: .init(top: padding, leading: padding, bottom: padding, trailing: padding), fontsize: fontsize, color: color)
  }
  
  public static func button(_ fontCode: FontCode, action: @escaping () -> Void, padding: EdgeInsets, fontsize: CGFloat = 20, color: Color? = nil) -> some View {
    Button(action: action) {
      VStack{
        text(fontCode, fontsize: fontsize, color: color)
      }.padding(padding).contentShape(Rectangle())
    }.buttonStyle(PlainButtonStyle())
  }
}
