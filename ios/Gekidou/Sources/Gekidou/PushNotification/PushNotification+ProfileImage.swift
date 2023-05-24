import Foundation
import os.log

extension PushNotification {
    public func fetchProfileImageSync(_ serverUrl: String, senderId: String, overrideIconUrl: String?, completionHandler: @escaping (_ data: Data?) -> Void) {
        var updatedAt: Double = 0
        func processResponse(data: Data?, response: URLResponse?, error: Error?) {
            if let httpResponse = response as? HTTPURLResponse {
                let statusCode = httpResponse.statusCode
                let errorMessage = error?.localizedDescription ?? ""
                if (statusCode == 200 && error == nil) {
                    ImageCache.default.insertImage(data, for: senderId, updatedAt: updatedAt, forServer: serverUrl)
                    completionHandler(data)
                } else {
                    os_log(
                        OSLogType.default,
                        "Mattermost Notifications: Request for profile image failed with status %{public}@ and error %{public}@",
                        String(statusCode),
                        errorMessage
                    )
                    completionHandler(nil)
                }
            }
        }
        
        if let overrideUrl = overrideIconUrl,
           let url = URL(string: overrideUrl) {
            Network.default.request(url, usingMethod: "GET", forServerUrl: "", completionHandler: processResponse)
        } else {
            if let lastUpdateAt = Database.default.getUserLastPictureAt(for: senderId, forServerUrl: serverUrl) {
                updatedAt = lastUpdateAt
            }
            if let image = ImageCache.default.image(for: senderId, updatedAt: updatedAt, forServer: serverUrl) {
                os_log(OSLogType.default, "Mattermost Notifications: cached image")
                completionHandler(image)
            } else {
                ImageCache.default.removeImage(for: senderId, forServer: serverUrl)
                os_log(OSLogType.default, "Mattermost Notifications: image not cached")
                Network.default.fetchUserProfilePicture(
                    userId: senderId, lastUpdateAt: updatedAt,
                    forServerUrl: serverUrl, completionHandler: processResponse
                )
            }
        }
    }
}
