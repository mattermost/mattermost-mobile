//
//  ImageThumbnail.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import SwiftUI

struct ImageThumbnail: View {
  var small = false
  var attachment: AttachmentModel
  var hasError: Bool
  
  func downsample(imageAt imageURL: URL,
                  to pointSize: CGSize,
                  scale: CGFloat = UIScreen.main.scale) -> UIImage? {

      // Create an CGImageSource that represent an image
      let imageSourceOptions = [kCGImageSourceShouldCache: false] as CFDictionary
      guard let imageSource = CGImageSourceCreateWithURL(imageURL as CFURL, imageSourceOptions) else {
          return nil
      }
      
      // Calculate the desired dimension
      let maxDimensionInPixels = max(pointSize.width, pointSize.height) * scale
      
      // Perform downsampling
      let downsampleOptions = [
          kCGImageSourceCreateThumbnailFromImageAlways: true,
          kCGImageSourceShouldCacheImmediately: true,
          kCGImageSourceCreateThumbnailWithTransform: true,
          kCGImageSourceThumbnailMaxPixelSize: maxDimensionInPixels
      ] as CFDictionary
      guard let downsampledImage = CGImageSourceCreateThumbnailAtIndex(imageSource, 0, downsampleOptions) else {
          return nil
      }
      
      // Return the downsampled image as UIImage
      return UIImage(cgImage: downsampledImage)
  }
  
  var body: some View {
    let imageSize: CGFloat = small ? 64 : 156
    
    Image(uiImage: downsample(imageAt: attachment.fileUrl, to: CGSize(width: imageSize, height: imageSize))!)
      .resizable()
      .aspectRatio(contentMode: small ? .fill : .fit)
      .frame(width: small ? 64 : nil, height: small ? 64 : imageSize)
      .clipped()
      .cornerRadius(4)
      .background(Color.theme.centerChannelBg)
      .overlay(
        RoundedRectangle(cornerRadius: 4)
          .stroke(
            hasError ? Color.theme.errorTextColor : Color.theme.centerChannelColor.opacity(0.16),
            lineWidth: 1
          )
      )
  }
}
