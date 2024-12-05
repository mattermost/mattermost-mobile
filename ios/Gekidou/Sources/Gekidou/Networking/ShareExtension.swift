//
//  File.swift
//  
//
//  Created by Elias Nahum on 26-06-22.
//

import Foundation
import os.log
import UserNotifications

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
    internal var failNotificationID: String?

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
    
    func scheduleFailNotification(timeout: Double = SHARE_TIMEOUT, description: String = NETWORK_ERROR_MESSAGE) -> String {
        let failNotification = UNMutableNotificationContent()
        failNotification.title = "Share content failed"
        failNotification.body = description

        let timeoutTrigger = UNTimeIntervalNotificationTrigger(timeInterval: timeout, repeats: false)

        let uuidString = UUID().uuidString
        let request = UNNotificationRequest(identifier: uuidString, content: failNotification, trigger: timeoutTrigger)

        // Schedule the request with the system.
        let notificationCenter = UNUserNotificationCenter.current()
        notificationCenter.add(request) { (_ Error) in
            // cancel any pending uploads if we hit the time limit.
            self.backgroundSession?.invalidateAndCancel()
            os_log(
                OSLogType.default,
                "Mattermost BackgroundSession: Cancelling uploads due to time out"
            )
            self.failNotificationID = nil
        }
        self.failNotificationID = uuidString
        return uuidString
    }
    func cancelFailNotification() -> Void {
        if let id = self.failNotificationID {
            UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [id])
            os_log(
                OSLogType.default,
                "Mattermost BackgroundSession: Cancelled fail notification %{id}@",
                id
            )
        }

        self.failNotificationID = nil
    }
    func notifyFailureNow(description: String = NETWORK_ERROR_MESSAGE) -> Void {
        self.cancelFailNotification()
        _ = self.scheduleFailNotification(timeout: 1, description: description)
    }
    
    func createCancelHandler(completionHandler: @escaping () -> Void) -> (Bool) -> Void {
        return { success in
            if success {
                self.cancelFailNotification()
                    
                // cancel any pending tasks in case of not getting connection. If this affects anything else, then we should track the uploads and cancel them individually
                // Session is configured to wait for connection, but we don't know when that's going to happen, so we die early if we don't get a connection in a time that
                // makes sense.
                self.backgroundSession?.invalidateAndCancel()
                completionHandler()
                return
            }
            
            if self.failNotificationID != nil {
                self.notifyFailureNow()
                os_log(
                    OSLogType.default,
                    "Mattermost BackgroundSession: sending fail notification now"
                )
            }
        completionHandler()
        }
    }
}
