//
//  CompassIcons.swift
//  SwiftUISample
//
//  Created by Elias Nahum on 13-06-22.
//

import Foundation

public enum DenimCode: UInt, CaseIterable {
    case sidebarBg = 0x1e325c
    case sidebarText = 0xffffff
    static var sidebarUnreadText: UInt {get {return 0xffffff}}
    case sidebarTextHoverBg = 0x28427b
    case sidebarTextActiveBorder = 0x579eff
    case sidebarTextActiveColor = 0x5d89ea
    case sidebarHeaderBg = 0x192a4d
    static var sidebarHeaderTextColor: UInt {get {return 0xffffff}}
    case sidebarTeamBarBg = 0x14213e
    case onlineIndicator = 0x3db887
    case awayIndicator = 0xffbc1f
    case dndIndicator = 0xd24b4e
    case centerChannelColor = 0x3f4350
    static var centerChannelBg: UInt {get {return 0xffffff}}
    case newMessageSeparator = 0xcc8f00
    static var linkColor: UInt {get {return 0x1c58d9}}
    case buttonBg = 0x1c58d9
    static var buttonColor: UInt {get {return 0xffffff}}
    static var errorTextColor: UInt {get {return 0xd24b4e}}
    static var mentionBg: UInt {get {return 0xffffff}}
    static var mentionColor: UInt {get {return 0x1e325c}}
    case mentionHighlightBg = 0xffd470
    case mentionHighlightLink = 0x1b1d22
}

public enum OnyxCode: UInt, CaseIterable {
    case sidebarBg = 0x121317
    case sidebarText = 0xffffff
    static var sidebarUnreadText: UInt {get {return 0xffffff}}
    case sidebarTextHoverBg = 0x25262a
    case sidebarTextActiveBorder = 0x1592e0
    static var sidebarTextActiveColor: UInt {get {return 0xffffff}}
    case sidebarHeaderBg = 0x1b1d22
    case sidebarHeaderTextColor  = 0xdddfe4
    case sidebarTeamBarBg = 0x000000
    case onlineIndicator = 0x3db887
    case awayIndicator = 0xf5ab00
    case dndIndicator = 0xd24b4e
    case mentionBg = 0x1c58d9
    static var mentionColor: UInt {get {return 0xffffff}}
    case centerChannelBg = 0x090a0b
    static var centerChannelColor: UInt {get {return 0xdddfe4}}
    case newMessageSeparator = 0x1adbdb
    case linkColor = 0x5d89ea
    case buttonBg = 0x386fe5
    static var buttonColor: UInt {get {return 0xffffff}}
    case errorTextColor = 0xda6c6e
    case mentionHighlightBg = 0x0d6e6e
    case mentionHighlightLink = 0xa4f4f4
}


