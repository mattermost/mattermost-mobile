//
//  ShareViewController.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import Gekidou
import SwiftUI
import UIKit
import os.log
import Sentry

class ShareViewController: UIViewController {
  private var fileManager: LocalFileManager?
  private var dismissKeyboardObserver: NSObjectProtocol?
  private var closeExtensionObserver: NSObjectProtocol?
  private var doPostObserver: NSObjectProtocol?
  
  override func viewDidLoad() {
    super.viewDidLoad()
    self.isModalInPresentation = true
    self.addObservers()
    fileManager = LocalFileManager()
    if let inputItems = extensionContext?.inputItems {
      fileManager!.extractDataFromContext(
        inputItems,
        completionHander: {[weak self] attachments, linkPreviewUrl, message in
          self?.showUIView(
            attachments: attachments,
            linkPreviewUrl: linkPreviewUrl,
            message: message
          )
        })
    }
    
    // Initialize Sentry
    initSentryAppExt()
  }
  
  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
  }
  
  private func addObservers() {
    self.dismissKeyboardObserver = NotificationCenter.default.addObserver(
      forName: NSNotification.Name("dismissKeyboard"),
      object: nil,
      queue: nil) { _ in
        self.dismissKeyboard()
        
      }
    
    self.closeExtensionObserver = NotificationCenter.default.addObserver(
      forName: NSNotification.Name("close"),
      object: nil,
      queue: nil,
      using: close
    )
    
    self.doPostObserver = NotificationCenter.default.addObserver(
      forName: NSNotification.Name("doPost"),
      object: nil,
      queue: nil, using: doPost
    )
  }
  
  private func removeObservers() {
    fileManager = nil
    NotificationCenter.default.removeObserver(dismissKeyboardObserver as Any)
    NotificationCenter.default.removeObserver(closeExtensionObserver as Any)
    NotificationCenter.default.removeObserver(doPostObserver as Any)
  }
  
  private func close(_ notification: Notification) {
    self.removeObservers()
    if let userInfo = notification.userInfo,
       let attachments = userInfo["attachments"] as? [AttachmentModel] {
        fileManager?.clearTempDirectory(attachments.map{ $0.fileUrl.path})
    }
    extensionContext?.completeRequest(returningItems: [])
  }
  
  private func dismissKeyboard() {
    self.view.endEditing(false)
  }
  
  private func doPost(_ notification: Notification) {
    if let userInfo = notification.userInfo {
      let serverUrl = userInfo["serverUrl"] as? String
      let channelId = userInfo["channelId"] as? String
      let text = userInfo["message"] as? String ?? ""
      let attachments = userInfo["attachments"] as? [AttachmentModel] ?? []
      let linkPreviewUrl = userInfo["linkPreviewUrl"] as? String
      let fileCount = attachments.count
      let files: [String] = attachments.map{ $0.fileUrl.absoluteString }
      
     
     
      var message = text
      if linkPreviewUrl != nil && !linkPreviewUrl!.isEmpty {
        if text.isEmpty {
          message = linkPreviewUrl!
        } else {
          message = "\(text)\n\n\(linkPreviewUrl!)"
        }
      }
      
      print("Do post to \(serverUrl ?? "") in channel \(channelId ?? "") the message \(message) with preview \(linkPreviewUrl ?? "") and attaching \(fileCount) files")
      if let url = serverUrl,
         let channel = channelId {
        os_log(
            OSLogType.default,
            "Mattermost BackgroundSession: Sharing content to serverUrl=%{public}@ in channelId=%{public}@ with message=%{public}@ and attaching %{public}@ files",
            url,
            channel,
            message,
            "\(fileCount)"
        )

        let shareExtension = Gekidou.ShareExtension()
        let uploadError = shareExtension.uploadFiles(
          serverUrl: url,
          channelId: channel,
          message: message,
          files: files,
          completionHandler: { [weak self] in
            self?.removeObservers()
            self?.extensionContext!.completeRequest(returningItems: [])
          })
        if uploadError != nil {
          NotificationCenter.default.post(name: Notification.Name("errorPosting"), object: nil, userInfo: ["info": uploadError as Any])
        }
      } else {
        removeObservers()
        extensionContext!.completeRequest(returningItems: [])
      }
    }
  }
  
  func showUIView(attachments: [AttachmentModel], linkPreviewUrl: String?, message: String?) {
    let childView = UIHostingController(
      rootView: ShareUIView(
        attachments: attachments,
        linkPreviewUrl: linkPreviewUrl ?? "",
        message: message ?? ""
      )
    )
    addChild(childView)
    childView.view.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(childView.view)
    childView.didMove(toParent: self)
    
    NSLayoutConstraint.activate([
      childView.view.widthAnchor.constraint(equalTo: view.widthAnchor),
      childView.view.heightAnchor.constraint(equalTo: view.heightAnchor),
      childView.view.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      childView.view.centerYAnchor.constraint(equalTo: view.centerYAnchor)
    ])
  }
}
