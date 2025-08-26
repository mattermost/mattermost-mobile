//
//  LocalFileManager.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import Foundation
import UIKit
import UniformTypeIdentifiers

typealias ExtractContentCompletionHandler = (_ attachments: [AttachmentModel], _ linkPreviewUrl: String?, _ message: String?) -> Void

class LocalFileManager {
  private var cacheURL: URL?
  private var dispatchGroup = DispatchGroup()
  
  init() {
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
        fileSize: Int64(attr.fileSize()),
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
  
  func getImagePixels(imageUrl: URL) -> Int64 {
    if let imageSourceRef = CGImageSourceCreateWithURL(imageUrl as CFURL, nil),
       let props: NSDictionary = CGImageSourceCopyPropertiesAtIndex(imageSourceRef, 0, nil),
       let height =  props["PixelHeight"] as? NSNumber,
       let width = props["PixelWidth"] as? NSNumber {
      return Int64(width.intValue * height.intValue)
    }
    
    return 0
  }
  
  func getImagePixels(image: UIImage) -> Int64 {
    guard let cgImage = image.cgImage else {
      return 0
    }
    
    return Int64(cgImage.width * cgImage.height)
  }
  
  public func extractDataFromContext(_ inputItems: [Any], completionHander: @escaping ExtractContentCompletionHandler) -> Void {
    var models: [AttachmentModel] = []
    var linkPreviewUrl: String? = nil
    var message: String? = nil
    
    for item in inputItems as! [NSExtensionItem] {
      guard let attachments = item.attachments else {continue}
      for itemProvider in attachments {
        if itemProvider.hasItemConformingToTypeIdentifier(UTType.movie.identifier) {
          dispatchGroup.enter()
          itemProvider.loadItem(forTypeIdentifier: UTType.movie.identifier, options: nil, completionHandler: {[weak self] movie, error in
            if error == nil,
               let url = movie as? URL,
               let attachment = self?.saveAttachment(url: url, type: .video) {
              models.append(attachment)
            }
            self?.dispatchGroup.leave()
          })
        }
        
        else if itemProvider.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
          dispatchGroup.enter()
          itemProvider.loadItem(forTypeIdentifier: UTType.image.identifier, options: nil, completionHandler: {[weak self] image, error in
            if error == nil {
              if let url = image as? URL,
                 var attachment = self?.saveAttachment(url: url, type: .image) {
                attachment.imagePixels = self?.getImagePixels(imageUrl: url)
                models.append(attachment)
              } else if let uiImage = image as? UIImage,
                        let data = uiImage.pngData(),
                        var attachment = self?.saveAttachmentImage(data) {
                attachment.imagePixels = self?.getImagePixels(image: uiImage)
                models.append(attachment)
              } else if let data = image as? Data,
                        var attachment = self?.saveAttachmentImage(data),
                        let uiImage = UIImage(data: data)
              {
                attachment.imagePixels = self?.getImagePixels(image: uiImage)
                models.append(attachment)
              }
            }
            self?.dispatchGroup.leave()
          })
        }
        
        else if itemProvider.hasItemConformingToTypeIdentifier(UTType.fileURL.identifier) {
          dispatchGroup.enter()
          itemProvider.loadItem(forTypeIdentifier: UTType.fileURL.identifier, options: nil, completionHandler: {[weak self] file, error in
            if error == nil,
               let url = file as? URL,
               let attachment = self?.saveAttachment(url: url, type: .file) {
              models.append(attachment)
            }
            self?.dispatchGroup.leave()
          })
        }
        
        else if itemProvider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
          dispatchGroup.enter()
          itemProvider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil, completionHandler: {[weak self] itemURL, error in
            if error == nil,
               let url = itemURL as? URL {
              linkPreviewUrl = url.absoluteString
            }
            self?.dispatchGroup.leave()
          })
        }
        
        else if itemProvider.hasItemConformingToTypeIdentifier(UTType.text.identifier) {
          dispatchGroup.enter()
          itemProvider.loadItem(forTypeIdentifier: UTType.text.identifier, options: nil, completionHandler: {[weak self] text, error in
            if error == nil,
               let msg = text as? String {
              message = msg
            }
            self?.dispatchGroup.leave()
          })
        }
      }
    }
    
    dispatchGroup.notify(queue: DispatchQueue.main) {
      completionHander(
        models,
        linkPreviewUrl,
        message
      )
    }
  }
}
