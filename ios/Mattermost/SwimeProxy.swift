//
//  SwimeProxy.swift
//  Mattermost
//
//  Created by Elias Nahum on 15-10-19.
//  Copyright © 2019 Facebook. All rights reserved.
//

import Foundation
import Swime

@objc @objcMembers public class MimeTypeProxy: NSObject {
  public init(mime: String, ext: String) {
    self.mime = mime
    self.ext = ext
  }

  /// Mime type string representation. For example "application/pdf"
  public let mime: String
  
  /// Mime type extension. For example "pdf"
  public let ext: String
}

@objc @objcMembers public class SwimeProxy: NSObject {
  public class var shared :SwimeProxy {
      struct Singleton {
          static let instance = SwimeProxy()
      }
      return Singleton.instance
  }
  
  public func getMimeFromUti(uti: String) -> MimeTypeProxy? {
    switch uti {
    case "org.openxmlformats.openxml":
      return MimeTypeProxy(mime: "application/xml", ext: ".xml")
    case "org.openxmlformats.wordprocessingml.document":
      return MimeTypeProxy(mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ext: ".docx")
    case "org.openxmlformats.spreadsheetml.sheet":
      return MimeTypeProxy(mime: "pplication/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ext: ".xlsx")
    case "org.openxmlformats.presentationml.presentation":
      return MimeTypeProxy(mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", ext: ".pptx")
    default:
      return nil
    }
  }
  
  @objc public func getMimeAndExtension(data: Data, uti: String) -> MimeTypeProxy? {
    let mime = getMimeFromUti(uti: uti);
    if (mime != nil) {
      return mime
    }

    let proxy = Swime.mimeType(data: data)
    if (proxy != nil) {
      return MimeTypeProxy(mime: proxy!.mime, ext: proxy!.ext)
    }
    
    return nil
  }
}
