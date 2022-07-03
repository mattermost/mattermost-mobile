//
//  Attachment.swift
//  SwiftUISample
//
//  Created by Elias Nahum on 20-06-22.
//

import Foundation
import SwiftUI

enum AttachmentType {
  case image, video, file
}

struct FileExtensionToType {
  static var audio = ["mp3", "wav", "wma", "m4a", "flac", "aac", "ogg"]
  static var code = ["as", "applescript", "osascript", "scpt", "bash", "sh", "zsh", "clj", "boot", "cl2", "cljc", "cljs", "cljs.hl", "cljscm", "cljx", "hic", "coffee", "_coffee", "cake", "cjsx", "cson", "iced", "cpp", "c", "cc", "h", "c++", "h++", "hpp", "cs", "csharp", "css", "d", "di", "dart", "delphi", "dpr", "dfm", "pas", "pascal", "freepascal", "lazarus", "lpr", "lfm", "diff", "django", "jinja", "dockerfile", "docker", "erl", "f90", "f95", "fsharp", "fs", "gcode", "nc", "go", "groovy", "handlebars", "hbs", "html.hbs", "html.handlebars", "hs", "hx", "java", "jsp", "js", "jsx", "json", "jl", "kt", "ktm", "kts", "less", "lisp", "lua", "mk", "mak", "md", "mkdown", "mkd", "matlab", "m", "mm", "objc", "obj-c", "ml", "perl", "pl", "php", "php3", "php4", "php5", "php6", "ps", "ps1", "pp", "py", "gyp", "r", "ruby", "rb", "gemspec", "podspec", "thor", "irb", "rs", "scala", "scm", "sld", "scss", "st", "sql", "swift", "ts", "tex", "vbnet", "vb", "bas", "vbs", "v", "veo", "xml", "html", "xhtml", "rss", "atom", "xsl", "plist", "yaml"]
  static var document = ["doc", "docx", "odt", "pages"]
  static var patch = ["patch"]
  static var pdf = ["pdf"]
  static var presentation = ["ppt", "pptx", "odp", "key"]
  static var spreadsheet = ["xls", "xlsx", "csv", "ods", "numbers"]
  static var text = ["txt", "rtf"]
  static var zip = ["zip", "tar", "tar.gz"]
}

struct AttachmentModel: Hashable {
  var fileName: String
  var fileSize: UInt64
  var fileUrl: URL
  var type: AttachmentType
  var imagePixels: UInt64?
  
  
  var formattedFileSize: String {
    let suffixes = ["bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
    let k: Double = 1024
    
    guard fileSize > 0 else {
      return "0 \(suffixes[0])"
    }
    
    let size = Double(fileSize)
    // Adapted from http://stackoverflow.com/a/18650828
    let i = floor(log(size) / log(k))
    
    // Format number with thousands separator and everything below 1 giga with no decimal places.
    let numberFormatter = NumberFormatter()
    numberFormatter.maximumFractionDigits = i < 3 ? 0 : 1
    numberFormatter.numberStyle = .decimal
    
    let numberString = numberFormatter.string(from: NSNumber(value: size / pow(k, i))) ?? "Unknown"
    let suffix = suffixes[Int(i)]
    return "\(numberString) \(suffix)"
  }
  
  func iconTypeColor() -> (CompassIconsCode, Color) {
    let ext = fileUrl.pathExtension.lowercased()
    
    if FileExtensionToType.audio.contains(ext) {
      return (CompassIconsCode.audioFile, Color.icon.blue)
    }
    
    if FileExtensionToType.code.contains(ext) {
      return (CompassIconsCode.codeFile, Color.icon.grey)
    }
    
    if FileExtensionToType.document.contains(ext) {
      return (CompassIconsCode.documentFile, Color.icon.blue)
    }
    
    if FileExtensionToType.patch.contains(ext) {
      return (CompassIconsCode.patchFile, Color.icon.blue)
    }
    
    if FileExtensionToType.pdf.contains(ext) {
      return (CompassIconsCode.pdfFile, Color.icon.red)
    }
    
    if FileExtensionToType.presentation.contains(ext) {
      return (CompassIconsCode.presentationFile, Color.icon.red)
    }
    
    if FileExtensionToType.spreadsheet.contains(ext) {
      return (CompassIconsCode.spredsheetFile, Color.icon.green)
    }
    
    if FileExtensionToType.text.contains(ext) {
      return (CompassIconsCode.textFile, Color.icon.grey)
    }
    
    if FileExtensionToType.zip.contains(ext) {
      return (CompassIconsCode.zipFile, Color.icon.blue)
    }
    
    return (CompassIconsCode.genericFile, Color.icon.grey)
  }
  
  @ViewBuilder
  func icon() -> some View {
    let (code, color) = iconTypeColor()
    FontIcon.text(
      FontCode.compassIcons(code: code),
      fontsize: 48,
      color: color
    )
  }
}
