import UIKit

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
            URLSession(configuration: .ephemeral).dataTask(with: request).resume()

            UploadSessionManager.shared.removeUploadSessionData(identifier: identifier)
            UploadSessionManager.shared.clearTempDirectory()
        }
    }
    
    public func attachSession(identifier: String, completionHandler: @escaping () -> Void) {
        self.completionHandler = completionHandler
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
        return self.session!
    }
    
    public func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        // here we should get the file Id and update it in the session
        guard let identifier = session.configuration.identifier else {return}
            do {
                let jsonObject = try JSONSerialization.jsonObject(with: data, options: []) as! NSDictionary
                let fileInfos = jsonObject.object(forKey: "file_infos") as! NSArray
                if fileInfos.count > 0 {
                    let fileInfoData = fileInfos[0] as! NSDictionary
                    let fileId = fileInfoData.object(forKey: "id") as! String
                    UploadSessionManager.shared.appendCompletedUploadToSession(identifier: identifier, fileId: fileId)
                }
            } catch {
                print("MMLOG: Failed to get the file upload response %@", error.localizedDescription)
            }

    }
    
    public func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        if error == nil {
            let identifier = session.configuration.identifier!
            guard let sessionData = UploadSessionManager.shared.getUploadSessionData(identifier: identifier) else {return}
            if sessionData.fileIds.count == sessionData.totalFiles {
                ProcessInfo().performExpiringActivity(withReason: "Need to post the message") { (expires) in
                    self.createPost(identifier: identifier)
                }
            }
        }
    }
    
    public func urlSessionDidFinishEvents(forBackgroundURLSession session: URLSession) {
        DispatchQueue.main.async {
            
            if self.completionHandler != nil {
                self.completionHandler!()
            }
        }
    }
}
