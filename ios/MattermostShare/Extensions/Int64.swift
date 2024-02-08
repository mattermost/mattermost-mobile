//
//  Int64.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import Foundation

extension Int64 {
  var formattedFileSize: String {
    let suffixes = ["bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
    let k: Double = 1024
    
    guard self > 0 else {
      return "0 \(suffixes[0])"
    }
    
    let size = Double(self)
    // Adapted from http://stackoverflow.com/a/18650828
    let i = floor(log(size) / log(k))
    
    // Format number with thousands separator and everything below 1 giga with no decimal places.
    let numberFormatter = i < 3 ? NumberFormatter.noFractionDigitsDecimalFormatter : NumberFormatter.oneFractionDigitDecimalFormatter
    let numberString = numberFormatter.string(from: NSNumber(value: size / pow(k, i))) ?? "Unknown"
    let suffix = suffixes[Int(i)]
    return "\(numberString) \(suffix)"
  }
}
