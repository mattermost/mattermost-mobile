//
//  Mattermost+RCTUITextView.m
//  Mattermost
//
//  Created by Elias Nahum on 6/18/19.
//  Copyright © 2019 Facebook. All rights reserved.
//

#import "Mattermost+RCTUITextView.h"
#import "RCTUITextView.h"
#import <React/RCTUtils.h>
#import "RCTMultilineTextInputView.h"

@implementation Mattermost_RCTUITextView

@end

@implementation RCTUITextView (DisableCopyPaste)

- (BOOL)canPerformAction:(SEL)action withSender:(id)sender
{
  NSDictionary *response = [[NSUserDefaults standardUserDefaults] dictionaryForKey:@"com.apple.configuration.managed"];
  if(response) {
    NSString *copyPasteProtection = response[@"copyAndPasteProtection"];
    BOOL prevent = action == @selector(paste:) ||
    action == @selector(copy:) ||
    action == @selector(cut:) ||
    action == @selector(_share:);
    
    if ([copyPasteProtection isEqual: @"true"] && prevent) {
      return NO;
    }
  }
  
  // Allow copy and paste string and image
  if (action == @selector(paste:)) {
    return [UIPasteboard generalPasteboard].string != nil || [UIPasteboard generalPasteboard].image != nil;
  }
  
  return [super canPerformAction:action withSender:sender];
}

-(void)paste:(id)sender {
  [super paste:sender];
  
  UIPasteboard *pasteboard = [UIPasteboard generalPasteboard];
  if (!pasteboard.hasImages) {
    return;
  }
  
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
  
  RCTMultilineTextInputView* textInputView = [self valueForKey:@"textInputDelegate"];
  NSString* reactTag = [textInputView valueForKey:@"reactTag"];
  RCTDirectEventBlock onChange = textInputView.onChange;
  onChange(@{
             @"file": tempFilename,
             @"fileSize": @([imageData length]),
             @"height": @(image.size.height),
             @"width": @(image.size.width),
             @"isVertical": @(vertical),
             @"origURL": uri,
             @"timestamp": timestamp,
             @"type": mimeType,
             @"uri": uri,
             @"text": self.attributedText.string,
             @"target": reactTag,
             });
  
  // Dismiss contextual menu
  [self resignFirstResponder];
}

@end
