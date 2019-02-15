import Foundation
import UIKit

@objc @objcMembers public class UploadManager: NSObject {
    public class var shared :UploadManager {
        struct Singleton {
            static let instance = UploadManager()
        }
        return Singleton.instance
    }

    public func uploadFiles(baseURL: String, token: String, channelId: String, message: String?, attachments: AttachmentArray<AttachmentItem>, callback: () -> Void) {
        let identifier = "mattermost-share-upload-\(UUID().uuidString)"
        UploadSessionManager.shared.createUploadSessionData(
            identifier: identifier,
            channelId: channelId,
            message: message ?? "",
            totalFiles: attachments.count
        )

        if attachments.count > 0 {
            // if the share action has attachments we upload the files first
            let uploadSession = UploadSession.shared.createURLSession(identifier: identifier)

            for index in 0..<attachments.count {
                guard let item = attachments[index] else {return}
                let url = URL(string: "\(baseURL)/api/v4/files?channel_id=\(channelId)&filename=\(item.fileName!)")
                var uploadRequest = URLRequest(url: url!)
                uploadRequest.httpMethod = "POST"
                uploadRequest.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

                let task = uploadSession.uploadTask(with: uploadRequest, fromFile: item.fileURL!)
                task.resume()
            }
        } else if message != nil {
            // if the share action only has a message we post it
            UploadSession.shared.createPost(identifier: identifier)
        }
        callback()
    }
}
