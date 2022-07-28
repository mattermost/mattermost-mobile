//
//  SwiftUIFontIcon.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

#if canImport(UIKit)
import UIKit
#else
import AppKit
#endif
import Foundation

public enum FontCode {
  case compassIcons(code: CompassIconsCode)
  
  var fontFamilyName: String {
    switch self {
    case .compassIcons:
      return "compass-icons"
    }
  }
  
  var fileName: String {
    switch self {
    case .compassIcons:
      return "compass-icons"
    }
  }
  
  var code: String {
    switch self {
    case .compassIcons(code: let code):
      return code.rawValue
    }
  }
}

public extension FontCode {
  func systemFont(size: CGFloat) -> UIFont {
    if (UIFont.fontNames(forFamilyName: self.fontFamilyName).count == 0) {
      FontLoader.loadFont(self)
    }
    
    return UIFont(name: self.fileName, size: size)!
  }
}

class FontLoader: NSObject {
  class func loadFont(_ fontCode: FontCode) {
    let fontName = fontCode.fileName
    let paths = self.getFontPaths()
    var fontURL = URL(string: "")
    var error: Unmanaged<CFError>?
    
    paths.forEach {
      guard let filename = NSURL(fileURLWithPath: $0).lastPathComponent,
            filename.lowercased().range(of: fontName.lowercased()) != nil else {
        return
      }
      
      fontURL = NSURL(fileURLWithPath: $0) as URL
    }
    
    guard let unwrappedFontURL = fontURL,
          let data = try? Data(contentsOf: unwrappedFontURL),
          let provider = CGDataProvider(data: data as CFData) else {
      return
    }
    
    let font = CGFont.init(provider)
    
    guard let unwappedFont = font,
          !CTFontManagerRegisterGraphicsFont(unwappedFont, &error),
          let unwrappedError = error,
          let nsError = (unwrappedError.takeUnretainedValue() as AnyObject) as? NSError else {
      return
    }
    
    let errorDescription: CFString = CFErrorCopyDescription(unwrappedError.takeUnretainedValue())
    
    NSException(name: NSExceptionName.internalInconsistencyException,
                reason: errorDescription as String,
                userInfo: [NSUnderlyingErrorKey: nsError]).raise()
  }
}

extension FontLoader {
  static func getFontPaths() -> [String] {
    let bundle = Bundle(for: FontLoader.self)
    return bundle.paths(forResourcesOfType: "ttf", inDirectory: nil)
  }
}
