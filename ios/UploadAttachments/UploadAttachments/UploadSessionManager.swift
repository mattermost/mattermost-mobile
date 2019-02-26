import Foundation

@objc public class UploadSessionData: NSObject {
    public var channelId: String?
    public var fileIds: [String] = []
    public var message: String = ""
    public var totalFiles: Int = 0
}

@objc @objcMembers public class UploadSessionManager: NSObject {
    private let bucket = MattermostBucket().bucket(byName: APP_GROUP_ID)
    
    public class var shared :UploadSessionManager {
        struct Singleton {
            static let instance = UploadSessionManager()
        }
        return Singleton.instance
    }
    
    public func createUploadSessionData(identifier: String, channelId: String, message: String, totalFiles: Int) {
        let fileIds: [String] = []
        let uploadSessionData:  NSDictionary = [
            "channelId": channelId,
            "fileIds": fileIds,
            "message": message,
            "totalFiles": totalFiles
        ]
        bucket?.set(uploadSessionData, forKey: identifier)
        bucket?.synchronize()
    }
    
    public func getUploadSessionData(identifier: String) -> UploadSessionData? {
        let dictionary = bucket?.object(forKey: identifier) as? NSDictionary
        let sessionData = UploadSessionData()

        sessionData.channelId = dictionary?.object(forKey: "channelId") as? String
        sessionData.fileIds = dictionary?.object(forKey: "fileIds") as? [String] ?? []
        sessionData.message = dictionary?.object(forKey: "message") as! String
        sessionData.totalFiles = dictionary?.object(forKey: "totalFiles") as! Int

        return sessionData
    }
    
    public func removeUploadSessionData(identifier: String) {
        bucket?.removeObject(forKey: identifier)
        bucket?.synchronize()
    }

    public func appendCompletedUploadToSession(identifier: String, fileId: String) {
        let uploadSessionData = bucket?.object(forKey: identifier) as? NSDictionary
        if (uploadSessionData != nil) {
            let newData = uploadSessionData?.mutableCopy() as! NSMutableDictionary
            var fileIds = newData.object(forKey: "fileIds") as! [String]
            fileIds.append(fileId)
            newData.setValue(fileIds, forKey: "fileIds")
            bucket?.set(newData, forKey: identifier)
            bucket?.synchronize()
        }
    }
    
    public func tempContainerURL() -> URL? {
        let filemgr = FileManager.default
        let containerURL = filemgr.containerURL(forSecurityApplicationGroupIdentifier: APP_GROUP_ID)
        guard let tempDirectoryURL = containerURL?.appendingPathComponent("shareTempItems") else {return nil}
        var isDirectory = ObjCBool(false)
        let exists = filemgr.fileExists(atPath: tempDirectoryURL.path, isDirectory: &isDirectory)
        if !exists && !isDirectory.boolValue {
            try? filemgr.createDirectory(atPath: tempDirectoryURL.path, withIntermediateDirectories: true, attributes: nil)
        }
        
        return tempDirectoryURL
    }
    
    public func clearTempDirectory() {
        guard let tempURL = tempContainerURL() else {return}
        let fileMgr = FileManager.default
        try? fileMgr.removeItem(atPath: tempURL.path)
    }
}
