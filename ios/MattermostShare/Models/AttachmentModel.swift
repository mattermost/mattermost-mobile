//
//  Attachment.swift
//  SwiftUISample
//
//  Created by Elias Nahum on 20-06-22.
//

import Foundation

enum AttachmentType {
    case image, video, file
}


struct AttachmentModel {
    var fileName: String
    var fileSize: UInt64
    var fileUrl: URL
    var type: AttachmentType

    
    var formattedFileSize: String {
        let suffixes = ["bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
        let k: Double = 1024
        
        guard fileSize > 0 else {
            return "0 \(suffixes[0])"
        }

        let size = Double(fileSize)
        // Adapted from http://stackoverflow.com/a/18650828
        let i = floor(log(size) / log(k))

        // Format number with thousands separator and everything below 1 giga with no decimal places.
        let numberFormatter = NumberFormatter()
        numberFormatter.maximumFractionDigits = i < 3 ? 0 : 1
        numberFormatter.numberStyle = .decimal

        let numberString = numberFormatter.string(from: NSNumber(value: size / pow(k, i))) ?? "Unknown"
        let suffix = suffixes[Int(i)]
        return "\(numberString) \(suffix)"
    }
}
