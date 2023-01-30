//
//  Color.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import Foundation
import SwiftUI

extension Color {
  static let theme = ColorTheme()
  static let icon = ColorIcon()
  
  init(hex: String) {
    let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
    var int: UInt64 = 0
    Scanner(string: hex).scanHexInt64(&int)
    let a, r, g, b: UInt64
    switch hex.count {
    case 3: // RGB (12-bit)
      (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
    case 6: // RGB (24-bit)
      (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
    case 8: // ARGB (32-bit)
      (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
    default:
      (a, r, g, b) = (1, 1, 1, 0)
    }
    
    self.init(
      .sRGB,
      red: Double(r) / 255,
      green: Double(g) / 255,
      blue:  Double(b) / 255,
      opacity: Double(a) / 255
    )
  }
}

struct ColorTheme {
  let awayIndicator = Color("awayIndicator")
  let buttonBg = Color("buttonBg")
  let buttonColor = Color("buttonColor")
  let centerChannelBg = Color("centerChannelBg")
  let centerChannelColor = Color("centerChannelColor")
  let dndIndicator = Color("dndIndicator")
  let errorTextColor = Color("errorTextColor")
  let linkColor = Color("linkColor")
  let mentionBg = Color("mentionBg")
  let mentionColor = Color("mentionColor")
  let mentionHighlightBg = Color("mentionHighlightBg")
  let mentionHighlightLink = Color("mentionHighlightLink")
  let newMessageSeparator = Color("newMessageSeparator")
  let onlineIndicator = Color("onlineIndicator")
  let sidebarBg = Color("sidebarBg")
  let sidearHeaderBg = Color("sidearHeaderBg")
  let sidebarHeaderTextColor = Color("sidebarHeaderTextColor")
  let sidebarTeamBarBg = Color("sidebarTeamBarBg")
  let sidebarText = Color("sidebarText")
  let sidebarTextActiveBorder = Color("sidebarTextActiveBorder")
  let sidebarTextActiveColor = Color("sidebarTextActiveColor")
  let sidebarTextHoverBg = Color("sidebarTextHoverBg")
  let sidebarUnreadText = Color("sidebarUnreadText")
}

struct ColorIcon {
  let blue = Color(hex: "#338AFF")
  let red = Color(hex: "#ED522A")
  let green = Color(hex: "#1CA660")
  let grey = Color(hex: "#999999")
}
