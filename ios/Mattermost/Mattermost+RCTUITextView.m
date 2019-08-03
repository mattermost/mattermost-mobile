//
//  Mattermost+RCTUITextView.m
//  Mattermost
//
//  Created by Elias Nahum on 6/18/19.
//  Copyright © 2019 Facebook. All rights reserved.
//

#import "Mattermost+RCTUITextView.h"
#import "RCTUITextView.h"
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
  
  NSString *uri = pasteboard.string;
  NSPredicate *predicate = [NSPredicate predicateWithFormat:@"SELF BEGINSWITH 'public'"];
  NSString *mimeType = [[pasteboard.pasteboardTypes filteredArrayUsingPredicate:predicate] firstObject];
  
  NSData *imageData;
  if ([mimeType isEqualToString:@"public.jpeg"]) {
    imageData = UIImageJPEGRepresentation(pasteboard.image, 1.0);
  } else {
    imageData = UIImagePNGRepresentation(pasteboard.image);
  }
  
  NSString *tempFilename = [[NSProcessInfo processInfo] globallyUniqueString];
  NSURL *tempFileURL = [NSURL fileURLWithPath:[NSTemporaryDirectory() stringByAppendingPathComponent:tempFilename]];
  BOOL success = [imageData writeToURL:tempFileURL atomically:YES];
  
  if (success) {
    uri = tempFileURL.absoluteString;
  }
  
  RCTMultilineTextInputView* textInputView = [self valueForKey:@"textInputDelegate"];
  NSString* reactTag = [textInputView valueForKey:@"reactTag"];
  RCTDirectEventBlock onChange = textInputView.onChange;
  onChange(@{
             @"type": mimeType,
             @"uri": uri,
             @"text": self.attributedText.string,
             @"target": reactTag,
             });
}

@end
