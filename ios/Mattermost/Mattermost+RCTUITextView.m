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
#import "ClipboardManager.h"

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
  
  RCTMultilineTextInputView* textInputView = [self valueForKey:@"textInputDelegate"];
  RCTDirectEventBlock onChange = textInputView.onChange;
  if (onChange) {
    NSDictionary *image = [ClipboardManager getCopiedImage];
    NSString* reactTag = [textInputView valueForKey:@"reactTag"];

    onChange(@{
               @"image": image,
               @"text": self.attributedText.string,
               @"target": reactTag,
               });
  
    // Dismiss contextual menu
    [self resignFirstResponder];
  }
}

@end
