//
//  ClipboardManager.m
//  Mattermost
//
//  Created by Tek Min Ewe on 03/08/2019.
//  Copyright © 2019 Facebook. All rights reserved.
//

#import <UIKit/UIKit.h>
#import "ClipboardManager.h"
#import "NSData+MimeType.h"

@implementation ClipboardManager

+(NSDictionary *)getCopiedImage {
  UIPasteboard *pasteboard = [UIPasteboard generalPasteboard];
  UIImage *image = pasteboard.image;
  NSString *uri = pasteboard.string;
  NSArray<NSString *> *types = pasteboard.pasteboardTypes;
  
  NSData *imageData;
  if ([types[0] isEqual:@"public.jpeg"]) {
    imageData = UIImageJPEGRepresentation(image, 1.0);
  } else if ([types[0] isEqual:@"public.png"]) {
    imageData = UIImagePNGRepresentation(image);
  } else {
    imageData = [pasteboard dataForPasteboardType:types[0]];
  }
  NSString *extension = [imageData extension];
  NSString *mimeType = [imageData mimeType];
  
  NSString *tempFilename = [NSString stringWithFormat:@"%@%@", [[NSProcessInfo processInfo] globallyUniqueString], extension];
  NSURL *tempFileURL = [NSURL fileURLWithPath:[NSTemporaryDirectory() stringByAppendingPathComponent:tempFilename]];
  BOOL success = [imageData writeToURL:tempFileURL atomically:YES];
  
  if (success) {
    uri = tempFileURL.absoluteString;
  }
  
  BOOL vertical = (image.size.width < image.size.height) ? YES : NO;
  
  NSISO8601DateFormatter *dateFormatter = [[NSISO8601DateFormatter alloc] init];
  NSString *timestamp = [dateFormatter stringFromDate:[NSDate date]];
  
  return @{
           @"fileName": tempFilename,
           @"fileSize": @([imageData length]),
           @"height": @(image.size.height),
           @"width": @(image.size.width),
           @"isVertical": @(vertical),
           @"origURL": uri,
           @"timestamp": timestamp,
           @"type": mimeType,
           @"uri": uri,
           };
}

@end
