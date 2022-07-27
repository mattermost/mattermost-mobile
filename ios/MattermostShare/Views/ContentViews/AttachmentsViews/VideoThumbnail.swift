//
//  VideoThumbnail.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import SwiftUI
import AVKit
import AVFoundation

func getThumbnailFrom(path: URL) -> UIImage? {
  do {
    let asset = AVURLAsset(url: path, options: nil)
    let imgGenerator = AVAssetImageGenerator(asset: asset)
    imgGenerator.appliesPreferredTrackTransform = true
    imgGenerator.maximumSize = CGSize(width: 180, height: 180)
    let cgImage = try imgGenerator.copyCGImage(at: CMTimeMake(value: 0, timescale: 1), actualTime: nil)
    let thumbnail = UIImage(cgImage: cgImage)
    return thumbnail
  } catch let error {
    print("*** Error generating thumbnail: \(error.localizedDescription)")
    return nil
  }
}

struct VideoThumbnail: View {
  var small = false
  var attachment: AttachmentModel
  var hasError: Bool
  
  var body: some View {
    let thumb = getThumbnailFrom(path: attachment.fileUrl)
    if (thumb != nil) {
      let borderColor = Color.theme.centerChannelColor.opacity(0.16)
      ZStack {
        Image(uiImage: thumb!)
          .resizable()
          .aspectRatio(contentMode: small ? .fill : .fit)
          .frame(
            maxWidth: small ? 104 : nil)
          .frame(height: small ? 104 : 180)
          .cornerRadius(4)
          .overlay(
            RoundedRectangle(cornerRadius: 4)
              .fill(LinearGradient(
                gradient: Gradient(
                  stops: [
                    Gradient.Stop(color: Color(red: 0, green: 0, blue: 0, opacity: 0.24), location: 0.125),
                    Gradient.Stop(color: Color(red: 0, green: 0, blue: 0, opacity: 0.0), location: 0.4755)
                  ]),
                startPoint: .topTrailing, endPoint: .bottomLeading))
          )
      }
      .overlay(
        ZStack {
          RoundedRectangle(cornerRadius: 4)
            .stroke(hasError ? Color.theme.errorTextColor : borderColor, lineWidth: 1)
            .shadow(color: borderColor, radius: 3, x: 0, y: 2)
          FontIcon.text(
            FontCode.compassIcons(code: .play),
            fontsize: 24,
            color: .white
          )
          .padding(.trailing, 6)
          .padding(.bottom, 6)
          .frame(
            height: small ? 104 : 180,
            alignment: .bottomTrailing)
        }
      )
    }
  }
}
