//
//  File.swift
//
//
//  Created by Elias Nahum on 26-06-22.
//

import Foundation
import os.log

extension ShareExtension {
    public func uploadFiles(serverUrl: String, channelId: String, message: String,
                            files: [String], completionHandler: @escaping () -> Void, isDraft: Bool = false) -> String? {
        let id = "mattermost-share-upload-\(UUID().uuidString)"

        createUploadSessionData(
            id: id, serverUrl: serverUrl,
            channelId: channelId, message: message,
            files: files,
            isDraft: isDraft
        )

        if isDraft {
            self.saveMessageAsDraftForSession(withId: id)
        }

        guard let credentials = try? Keychain.default.getCredentials(for: serverUrl),
              let token = credentials.token else {return "Could not retrieve the session token from the KeyChain"}

        if !files.isEmpty {
            createBackroundSession(id: id)
            os_log(
                OSLogType.default,
                "Mattermost BackgroundSession: uploading %{public}@ files for identifier=%{public}@",
                String(files.count),
                id
            )
            for file in files {
                if let fileUrl = URL(string: file),
                    fileUrl.isFileURL {
                    let filename = fileUrl.lastPathComponent
                    let safeFilename = filename.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)
                    if let safeFilename = safeFilename,
                        let url = URL(string: "\(serverUrl)/api/v4/files?channel_id=\(channelId)&filename=\(safeFilename)") {
                        var uploadRequest = URLRequest(url: url)
                        uploadRequest.httpMethod = "POST"
                        uploadRequest.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

                        if let preauthSecret = credentials.preauthSecret {
                            uploadRequest.addValue(preauthSecret, forHTTPHeaderField: GekidouConstants.HEADER_X_MATTERMOST_PREAUTH_SECRET)
                        }

                        if let task = backgroundSession?.uploadTask(with: uploadRequest, fromFile: fileUrl) {
                            os_log(
                                OSLogType.default,
                                "Mattermost BackgroundSession: Start uploading file %{public}@ for identifier=%{public}@",
                                filename,
                                id
                            )

                            task.resume()
                        } else {
                            os_log(
                                OSLogType.default,
                                "Mattermost BackgroundSession: Task not created to upload file %{public}@ for identifier=%{public}@",
                                filename,
                                id
                            )
                        }
                    } else {
                        os_log(
                            OSLogType.default,
                            "Mattermost BackgroundSession: The file %{public}@ for identifier=%{public}@ could not be processed for upload",
                            filename,
                            id
                        )
                        return "The file \(filename) could not be processed for upload"
                    }
                } else {
                    os_log(
                        OSLogType.default,
                        "Mattermost BackgroundSession: File %{public}@ for identifier=%{public}@ not found or is not a valid URL",
                        file,
                        id
                    )
                    return "File not found \(file)"
                }
            }
            completionHandler()
        } else if !message.isEmpty {
            os_log(
                OSLogType.default,
                "Mattermost BackgroundSession: posting message for identifier=%{public}@ without files",
                id
            )
            self.postMessageForSession(withId: id, completionHandler: completionHandler)
        }

        return nil
    }

    func postMessageForSession(withId id: String, completionHandler: (() -> Void)? = nil) {
        guard let data = getUploadSessionData(id: id)
        else {
            os_log(
                OSLogType.default,
                "Mattermost BackgroundSession: postMessageForSession fail to get data for identifier=%{public}@",
                id
            )
            return
        }

        self.deleteUploadedFiles(files: data.files)
        
        if data.isDraft {
            self.saveMessageAsDraftForSession(withId: id, completionHandler: completionHandler)
            self.removeUploadSessionData(id: id)
            return
        }
        
        self.removeUploadSessionData(id: id)

        if let serverUrl = data.serverUrl,
            let channelId = data.channelId {
            Network.default.createPost(
                serverUrl: serverUrl,
                channelId: channelId,
                message: data.message,
                fileIds: data.fileIds,
                completionHandler: {info, reponse, error in
                    if let err = error {
                        os_log(
                            "Mattermost BackgroundSession: error to create post for session identifier=%{public}@ -- %{public}@",
                            log: .default,
                            type: .error,
                            id,
                            err.localizedDescription
                        )
                    }

                    if let handler = completionHandler {
                        os_log(
                            OSLogType.default,
                            "Mattermost BackgroundSession: postMessageForSession without files call completionHandler for identifier=%{public}@",
                            id
                        )
                        handler()
                    }
                })
        }
    }

    func saveMessageAsDraftForSession(withId id: String, completionHandler: (() -> Void)? = nil) {
        guard let data = getUploadSessionData(id: id)
        else {
            os_log(
                OSLogType.default,
                "Mattermost BackgroundSession: saveMessageAsDraftForSession failed to get session data for identifier=%{public}@",
                id
            )
            return
        }

        guard let serverUrl = data.serverUrl,
              let channelId = data.channelId else { return }
        
        let isAppRunning = (Gekidou.Preferences.default.object(forKey: "ApplicationIsRunning") as? String) == "true"
        let filesArray = data.fileIds.compactMap { fileId in
            data.filesInfo[fileId] as? [String: Any]
        }

        if isAppRunning {
            handleDraftWhileAppRunning(channelId: channelId, data: data, filesArray: filesArray, completionHandler: completionHandler)
        } else {
            handleDraftInBackground(id: id, serverUrl: serverUrl, channelId: channelId, data: data, filesArray: filesArray, completionHandler: completionHandler)
        }
    }

    private func handleDraftWhileAppRunning(channelId: String,
                                            data: UploadSessionData,
                                            filesArray: [[String: Any]],
                                            completionHandler: (() -> Void)?) {
        let draftData: [String: Any] = [
            "channelId": channelId,
            "message": data.message,
            "fileIds": data.fileIds,
            "files": filesArray
        ]
        
        Preferences.default.set(draftData, forKey: "ShareExtensionDraftUpdate")
        CFNotificationCenterPostNotification(
            CFNotificationCenterGetDarwinNotifyCenter(),
            CFNotificationName("share.extension.draftUpdate" as CFString),
            nil, nil, true
        )
        completionHandler?()
    }

    private func handleDraftInBackground(id: String,
                                         serverUrl: String,
                                         channelId: String,
                                         data: UploadSessionData,
                                         filesArray: [[String: Any]],
                                         completionHandler: (() -> Void)?) {
        do {
            if let existingDraft = try Database.default.getDraft(serverUrl: serverUrl, channelId: channelId, rootId: "") {
                if (existingDraft.message == data.message) {
                    completionHandler?()
                    return
                }

                let updatedDraft = Draft(
                    id: existingDraft.id,
                    channelId: channelId,
                    rootId: existingDraft.rootId,
                    message: data.message,
                    files: filesArray,
                    metadata: existingDraft.metadata,
                    updateAt: Date().timeIntervalSince1970
                )
                try Database.default.insertDraft(updatedDraft, serverUrl: serverUrl)
            } else {
                guard !data.message.isEmpty || !data.fileIds.isEmpty else {
                    completionHandler?()
                    return
                }
                
                let newDraft = Draft(
                    id: id,
                    channelId: channelId,
                    rootId: "",
                    message: data.message,
                    files: filesArray,
                    metadata: "{}",
                    updateAt: Date().timeIntervalSince1970
                )
                try Database.default.insertDraft(newDraft, serverUrl: serverUrl)
            }
            completionHandler?()
        } catch {
            os_log(
                OSLogType.default,
                "Mattermost BackgroundSession: saveMessageAsDraftForSession failed to save draft for identifier=%{public}@",
                id,
                error.localizedDescription
            )
        }
    }
}
