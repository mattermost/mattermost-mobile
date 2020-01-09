import UIKit
import os.log

@objc @objcMembers public class UploadSession: NSObject, URLSessionDataDelegate {
    public class var shared :UploadSession {
        struct Singleton {
            static let instance = UploadSession()
        }
        return Singleton.instance
    }
    var completionHandler: (() -> Void)?
    public var session: URLSession?
    
    public func createPost(identifier: String) {
        let store = StoreManager.shared() as StoreManager
        let _ = store.getEntities(true)
        let serverURL = store.getServerUrl()
        let sessionToken = store.getToken()
        
        if (serverURL != nil && sessionToken != nil) {
            let urlString = "\(serverURL!)/api/v4/posts"
            
            guard let uploadSessionData = UploadSessionManager.shared.getUploadSessionData(identifier: identifier) else {return}
            guard let url = URL(string: urlString) else {return}
            
            if uploadSessionData.message != "" || uploadSessionData.fileIds.count > 0 {
                let jsonObject: [String: Any] = [
                    "channel_id": uploadSessionData.channelId as Any,
                    "message": uploadSessionData.message as Any,
                    "file_ids": uploadSessionData.fileIds
                ]
                if !JSONSerialization.isValidJSONObject(jsonObject) {return}
                
                var request = URLRequest(url: url)
                request.httpMethod = "POST"
                request.setValue("Bearer \(sessionToken!)", forHTTPHeaderField: "Authorization")
                request.setValue("application/json; charset=utf-8", forHTTPHeaderField: "Content-Type")
                request.httpBody = try? JSONSerialization.data(withJSONObject: jsonObject, options: .prettyPrinted)
                
                if #available(iOS 12.0, *) {
                    os_log(OSLogType.default, "Mattermost will post identifier=%{public}@", identifier)
                }
                
                URLSession(configuration: .ephemeral).dataTask(with: request).resume()
                
                UploadSessionManager.shared.removeUploadSessionData(identifier: identifier)
                UploadSessionManager.shared.clearTempDirectory()
            }
        }
    }
    
    public func attachSession(identifier: String, completionHandler: @escaping () -> Void) {
        self.completionHandler = completionHandler
        if #available(iOS 12.0, *) {
            os_log(OSLogType.default, "Mattermost Attached session with completionHandler identifier=%{public}@", identifier)
        }
        let sessionConfig = URLSessionConfiguration.background(withIdentifier: identifier)
        sessionConfig.sharedContainerIdentifier = APP_GROUP_ID
        if #available(iOS 11.0, *) {
            sessionConfig.waitsForConnectivity = true
        }
        
        session = URLSession(configuration: sessionConfig, delegate: self, delegateQueue: OperationQueue.main)
    }
    
    public func createURLSession(identifier: String) -> URLSession {
        let sessionConfig = URLSessionConfiguration.background(withIdentifier: identifier)
        sessionConfig.sharedContainerIdentifier = APP_GROUP_ID
        if #available(iOS 11.0, *) {
            sessionConfig.waitsForConnectivity = true
        }
        
        self.session = URLSession(configuration: sessionConfig, delegate: self, delegateQueue: nil)
        if #available(iOS 12.0, *) {
            os_log(OSLogType.default, "Mattermost Session created identifier=%{public}@", identifier)
        }
        return self.session!
    }
    
    public func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        // here we should get the file Id and update it in the session
        guard let identifier = session.configuration.identifier else {return}
        do {
            let jsonObject = try JSONSerialization.jsonObject(with: data, options: []) as! NSDictionary
            if jsonObject.object(forKey: "file_infos") != nil {
                let fileInfos = jsonObject.object(forKey: "file_infos") as! NSArray
                if fileInfos.count > 0 {
                    let fileInfoData = fileInfos[0] as! NSDictionary
                    let fileId = fileInfoData.object(forKey: "id") as! String
                    UploadSessionManager.shared.appendCompletedUploadToSession(identifier: identifier, fileId: fileId)
                }
            }
        } catch {
            if #available(iOS 12.0, *) {
                os_log(OSLogType.default, "Mattermost Failed to receive data identifier=%{public}@ error=%{public}", identifier, error.localizedDescription)
            }
            print("MMLOG: Failed to get the file upload response %@", error.localizedDescription)
        }
        
    }
    
    public func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        if error == nil {
            let identifier = session.configuration.identifier!
            guard let sessionData = UploadSessionManager.shared.getUploadSessionData(identifier: identifier) else {return}
            if sessionData.fileIds.count == sessionData.totalFiles {
                if #available(iOS 12.0, *) {
                    os_log(OSLogType.default, "Mattermost did complete upload identifier=%{public}@", identifier)
                }
                ProcessInfo().performExpiringActivity(withReason: "Need to post the message") { (expires) in
                    self.createPost(identifier: session.configuration.identifier!)
                }
            }
        }
    }
    
    public func urlSessionDidFinishEvents(forBackgroundURLSession session: URLSession) {
        if #available(iOS 12.0, *) {
            os_log(OSLogType.default, "Mattermost urlSessionDidFinishEvents identifier=%{public}@", session.configuration.identifier ?? "no identifier")
        }
        
        DispatchQueue.main.asyncAfter(deadline: DispatchTime.now() + Double(Int64(1.0*Double(NSEC_PER_SEC))) / Double(NSEC_PER_SEC), execute: {
            if self.completionHandler != nil {
                if #available(iOS 12.0, *) {
                    os_log(OSLogType.default, "Mattermost CALLED COMPLETIONHANDLER")
                }
                self.completionHandler!()
            }
        })
    }

    public func notificationReceipt(notificationId: Any?, receivedAt: Int, type: Any?) {
        notificationReceipt(notificationId:notificationId, receivedAt:receivedAt, type:type, postId:nil, idLoaded: false, completion:{_, _ in})
    }

    public func notificationReceipt(notificationId: Any?, receivedAt: Int, type: Any?, postId: Any? = nil, idLoaded: Bool, completion: @escaping (Data?, Error?) -> Void) {
        if (notificationId != nil) {
            let store = StoreManager.shared() as StoreManager
            let entities = store.getEntities(true)
            if (entities != nil) {
                let serverURL = store.getServerUrl()
                let sessionToken = store.getToken()
                
                if (serverURL != nil && sessionToken != nil) {
                    let urlString = "\(serverURL!)/api/v4/notifications/ack"
                    
                    let jsonObject: [String: Any] = [
                        "id": notificationId as Any,
                        "received_at": receivedAt,
                        "platform": "ios",
                        "type": type as Any,
                        "post_id": postId as Any,
                        "is_id_loaded": idLoaded as Bool
                    ]
                    
                    if !JSONSerialization.isValidJSONObject(jsonObject) {return}

                    guard let url = URL(string: urlString) else {return}
                    var request = URLRequest(url: url)
                    request.httpMethod = "POST"
                    request.setValue("Bearer \(sessionToken!)", forHTTPHeaderField: "Authorization")
                    request.setValue("application/json; charset=utf-8", forHTTPHeaderField: "Content-Type")
                    request.httpBody = try? JSONSerialization.data(withJSONObject: jsonObject, options: .prettyPrinted)

                    let task = URLSession(configuration: .ephemeral).dataTask(with: request) { data, _, error in
                        completion(data, error)
                    }
                    task.resume()
                }
            }
        }
    }
}
