//
//  FileCache.swift
//  Gekidou
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import Foundation
import UIKit

public class FileCache: NSObject {
  private var cacheURL: URL?
  @objc public static let `default` = FileCache()
  
  override private init() {
    super.init()
    let filemgr = FileManager.default
    let appGroupId = Bundle.main.infoDictionary!["AppGroupIdentifier"] as! String
    let containerUrl = filemgr.containerURL(forSecurityApplicationGroupIdentifier: appGroupId)
    if let url = containerUrl,
    let cacheURL = url.appendingPathComponent("Library", isDirectory: true) as URL? {
      self.cacheURL = cacheURL.appendingPathComponent("Caches", isDirectory:  true)
      self.createDirectoryIfNeeded(directory: self.cacheURL)
    }
  }
  
  private func createDirectoryIfNeeded(directory: URL?) {
    var isDirectory = ObjCBool(false)
       
    if let cachePath = directory?.path {
      let exists = FileManager.default.fileExists(atPath: cachePath, isDirectory: &isDirectory)
      
      if !exists && !isDirectory.boolValue {
        try? FileManager.default.createDirectory(atPath: cachePath, withIntermediateDirectories: true, attributes: nil)
      }
    }
  }
  
  private func getUrlImageFor(serverUrl: String, userId: String) -> URL? {
    guard let url = cacheURL else {return nil}
    
    let serverCacheURL = url.appendingPathComponent(serverUrl.toUrlSafeBase64Encode(), isDirectory: true)
    createDirectoryIfNeeded(directory: serverCacheURL)
    return serverCacheURL.appendingPathComponent(userId + ".png")
  }
    
  public func getProfileImage(serverUrl: String, userId: String) -> UIImage? {
    guard let url = getUrlImageFor(serverUrl: serverUrl, userId: userId) else { return nil }
    return UIImage(contentsOfFile: url.path)
  }
    
  public func saveProfileImage(serverUrl: String, userId: String, imageData: Data?) {
    guard let data = imageData,
    let url = getUrlImageFor(serverUrl: serverUrl, userId: userId)
    else { return }
    
    do {
      try data.write(to: url)
    } catch let error {
      print("Erro saving image. \(error)")
    }
  }
}
