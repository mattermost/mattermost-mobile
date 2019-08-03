//
//  ClipboardManager.m
//  Mattermost
//
//  Created by Tek Min Ewe on 03/08/2019.
//  Copyright © 2019 Facebook. All rights reserved.
//

#import <UIKit/UIKit.h>
#import "ClipboardManager.h"

@implementation ClipboardManager

+(NSDictionary *)getCopiedImage {
  UIPasteboard *pasteboard = [UIPasteboard generalPasteboard];
  UIImage *image = pasteboard.image;
  NSString *uri = pasteboard.string;
  NSPredicate *predicate = [NSPredicate predicateWithFormat:@"SELF BEGINSWITH 'public'"];
  NSString *mimeType = [[pasteboard.pasteboardTypes filteredArrayUsingPredicate:predicate] firstObject];
  
  NSData *imageData;
  NSString *extension;
  if ([mimeType isEqualToString:@"public.jpeg"]) {
    imageData = UIImageJPEGRepresentation(pasteboard.image, 1.0);
    extension = @".jpg";
  } else {
    imageData = UIImagePNGRepresentation(pasteboard.image);
    extension = @".png";
  }
  
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
           @"file": tempFilename,
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
