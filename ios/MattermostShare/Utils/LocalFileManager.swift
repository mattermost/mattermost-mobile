//
//  LocalFileManager.swift
//  MattermostShare
//
//  Created by Elias Nahum on 24-06-22.
//  Copyright © 2022 Facebook. All rights reserved.
//

import Foundation
import UIKit
import UniformTypeIdentifiers

class LocalFileManager {
  private var cacheURL: URL?
  static let instance = LocalFileManager()
  
  private init() {
    let filemgr = FileManager.default
    let appGroupId = Bundle.main.infoDictionary!["AppGroupIdentifier"] as! String
    let containerUrl = filemgr.containerURL(forSecurityApplicationGroupIdentifier: appGroupId)
    if let url = containerUrl,
       let cacheURL = url.appendingPathComponent("Library", isDirectory: true) as URL? {
        self.cacheURL = cacheURL.appendingPathComponent("Caches", isDirectory:  true)
        createDirectoryIfNeeded()
    }
  }
  
  private func createDirectoryIfNeeded() {
    var isDirectory = ObjCBool(false)
    
    if let cachePath = cacheURL?.path {
      let exists = FileManager.default.fileExists(atPath: cachePath, isDirectory: &isDirectory)

      if !exists && !isDirectory.boolValue {
        try? FileManager.default.createDirectory(atPath: cachePath, withIntermediateDirectories: true, attributes: nil)
      }
    }
  }
  
  private func getURLForImage(imageName: String) -> URL? {
    guard let url = cacheURL else {return nil}
    createDirectoryIfNeeded()
    return url.appendingPathComponent(imageName + ".png")
  }
  
  func clearTempDirectory(_ files: [String]) {
    guard let _ = self.cacheURL else {return}
    let fileMgr = FileManager.default
    files.forEach{ path in
      do {
        try fileMgr.removeItem(atPath: path)
      } catch {
        print("Error deleting file \(path)")
      }
    }
  }
  
  func saveAttachment(url: URL, type: AttachmentType) -> AttachmentModel? {
    let fileMgr = FileManager.default
    let fileName = url.lastPathComponent
    let tempFileURL = cacheURL?
      .appendingPathComponent(fileName)
    
    do {
      if (tempFileURL != url) {
        try? FileManager.default.removeItem(at: tempFileURL!)
        try fileMgr.copyItem(at: url, to: tempFileURL!)
      }
      
      let attr = try fileMgr.attributesOfItem(atPath: (tempFileURL?.path)!) as NSDictionary
      let attachment = AttachmentModel(
        fileName: fileName,
        fileSize: attr.fileSize(),
        fileUrl: tempFileURL!,
        type: type
      )
      
      return attachment
    } catch {
      return nil
    }
  }
  
  func saveAttachmentImage(_ data: Data) -> AttachmentModel? {
    guard let tempImageURL = cacheURL?
      .appendingPathComponent(UUID().uuidString)
      .appendingPathExtension(".png")
    else {return nil}
    
    if (try? data.write(to: tempImageURL)) != nil {
      return saveAttachment(url: tempImageURL, type: .image)
    }
    
    return nil
  }
  
  func saveProfileImage(image: UIImage, userId: String) {
    guard let data = image.pngData(),
          let url = getURLForImage(imageName: userId)
    else { return }
    
    do {
      try data.write(to: url)
    } catch let error {
      print("Erro saving image. \(error)")
    }
  }
  
  func getProfileImage(userId: String) -> UIImage? {
    guard let url = getURLForImage(imageName: userId) else { return nil }
    return UIImage(contentsOfFile: url.path)
  }
  
  public func extractDataFromContext(_ extensionContext: NSExtensionContext?) async throws ->
  (attachments: [AttachmentModel], linkPreviewUrl: String?, message: String?) {
    var models: [AttachmentModel] = []
    var linkPreviewUrl: String? = nil
    var message: String? = nil
    
    for item in extensionContext?.inputItems as! [NSExtensionItem] {
      guard let attachments = item.attachments else {continue}
      for itemProvider in attachments {
        if itemProvider.hasItemConformingToTypeIdentifier(UTType.movie.identifier) {
          if let movie = try? await itemProvider.loadItem(forTypeIdentifier: UTType.movie.identifier),
             let url = movie as? URL,
             let attachment = saveAttachment(url: url, type: .video) {
            models.append(attachment)
          }
        }
        
        else if itemProvider.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
          if let image = try? await itemProvider.loadItem(forTypeIdentifier: UTType.image.identifier) {
            if let url = image as? URL,
               let attachment = saveAttachment(url: url, type: .image) {
//              attachment.imagePixels = self.getImagePixels(imageUrl: url)
              models.append(attachment)
            } else if let uiImage = image as? UIImage,
                      let data = uiImage.pngData(),
                      let attachement = saveAttachmentImage(data) {
//              attachment?.imagePixels = self.getImagePixels(image: image)
              models.append(attachement)
            }
          }
        }
        
        else if itemProvider.hasItemConformingToTypeIdentifier(UTType.fileURL.identifier) {
          if let file = try? await itemProvider.loadItem(forTypeIdentifier: UTType.fileURL.identifier),
             let url = file as? URL,
             let attachment = saveAttachment(url: url, type: .file) {
            models.append(attachment)
          }
        }
        
        else if itemProvider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
          if let itemURL = try? await itemProvider.loadItem(forTypeIdentifier: UTType.url.identifier),
             let url = itemURL as? URL {
            linkPreviewUrl = url.absoluteString
          }
        }
        
        else if itemProvider.hasItemConformingToTypeIdentifier(UTType.text.identifier) {
          if let text = try? await itemProvider.loadItem(forTypeIdentifier: UTType.text.identifier),
             let msg = text as? String {
            message = msg
          }
        }
      }
    }
    
    return (models, linkPreviewUrl, message)
  }
}
