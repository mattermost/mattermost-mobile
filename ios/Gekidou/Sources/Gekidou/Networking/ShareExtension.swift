//
//  File.swift
//  
//
//  Created by Elias Nahum on 26-06-22.
//

import Foundation
import os.log

struct UploadSessionData {
    var serverUrl: String?
    var channelId: String?
    var files: [String] = []
    var fileIds: [String] = []
    var message: String = ""
    var totalFiles: Int = 0
    
    func toDictionary() -> NSDictionary {
        let data: NSDictionary = [
            "serverUrl": serverUrl as Any,
            "channelId": channelId as Any,
            "files": files,
            "fileIds": fileIds,
            "message": message,
            "totalFiles": totalFiles
        ]
        
        return data
    }
    
    func fromDictionary(dict: NSDictionary) -> UploadSessionData {
        let serverUrl = dict["serverUrl"] as! String
        let channelId = dict["channelId"] as! String
        let files = dict["files"] as! [String]
        let fileIds = dict["fileIds"] as! [String]
        let message = dict["message"] as! String
        let totalFiles = dict["totalFiles"] as! Int
        
        return UploadSessionData(
            serverUrl: serverUrl,
            channelId: channelId,
            files: files,
            fileIds: fileIds,
            message: message,
            totalFiles: totalFiles
        )
    }
}

public class ShareExtension: NSObject {
    public var backgroundSession: URLSession?
    private var cacheURL: URL?
    private let fileMgr = FileManager.default
    private let preferences = Preferences.default
    public var completionHandler: (() -> Void)?
    internal let lock = NSLock()

    public override init() {
        super.init()
        if let groupId = appGroupId,
           let containerUrl = fileMgr.containerURL(forSecurityApplicationGroupIdentifier: groupId),
           let url = containerUrl.appendingPathComponent("Library", isDirectory: true) as URL?,
           let cache = url.appendingPathComponent("Cache", isDirectory: true) as URL? {
            self.cacheURL = cache
            self.createCacheDirectoryIfNeeded()
        }
    }
    
    private func createCacheDirectoryIfNeeded() {
      var isDirectory = ObjCBool(false)
      
      if let cachePath = cacheURL?.path {
        let exists = FileManager.default.fileExists(atPath: cachePath, isDirectory: &isDirectory)

        if !exists && !isDirectory.boolValue {
          try? FileManager.default.createDirectory(atPath: cachePath, withIntermediateDirectories: true, attributes: nil)
        }
      }
    }
    
    func saveUploadSessionData(id: String, data: UploadSessionData) {
        preferences.set(data.toDictionary(), forKey: id)
        os_log(
            OSLogType.default,
            "Mattermost BackgroundSession: saveUploadSessionData for identifier=%{public}@",
            id
        )
    }
    
    func createUploadSessionData(id: String, serverUrl: String, channelId: String, message: String, files: [String]) {
        let data = UploadSessionData(
            serverUrl: serverUrl,
            channelId: channelId,
            files: files,
            message: message,
            totalFiles: files.count
        )
        
        saveUploadSessionData(id: id, data: data)
    }
    
    func getUploadSessionData(id: String) -> UploadSessionData? {
        if let data = preferences.object(forKey: id) as? NSDictionary {
            return UploadSessionData().fromDictionary(dict: data)
        }
        
        return nil
    }
    
    func removeUploadSessionData(id: String) {
        preferences.removeObject(forKey: id)
        os_log(
            OSLogType.default,
            "Mattermost BackgroundSession: removeUploadSessionData for identifier=%{public}@",
            id
        )
    }
    
    func appendCompletedUploadToSession(id: String, fileId: String) {
        if let data = getUploadSessionData(id: id) {
            var fileIds = data.fileIds
            fileIds.append(fileId)
            let newData = UploadSessionData(
                serverUrl: data.serverUrl,
                channelId: data.channelId,
                files: data.files,
                fileIds: fileIds,
                message: data.message,
                totalFiles: data.totalFiles
            )
            saveUploadSessionData(id: id, data: newData)
        }
    }
    
    func deleteUploadedFiles(files: [String]) {
        for file in files {
            do {
                try fileMgr.removeItem(atPath: file)
            } catch {
                os_log(
                    OSLogType.default,
                    "Mattermost BackgroundSession: deleteUploadedFiles filed to delete=%{public}@",
                    file
                )
            }
        }
    }
}
