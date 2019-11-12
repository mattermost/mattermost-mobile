//
//  Mattermost+RCTUITextView.m
//  Mattermost
//
//  Created by Elias Nahum on 6/18/19.
//  Copyright © 2019 Facebook. All rights reserved.
//

#import "Mattermost+RCTUITextView.h"
#import <React/RCTUITextView.h>
#import <React/RCTUtils.h>
#import <React/RCTMultilineTextInputView.h>
#import "OnPasteEventManager.h"
#import "UIPasteboard+GetImageInfo.h"

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

  if (action == @selector(paste:) && [UIPasteboard generalPasteboard].numberOfItems > 0) {
    return true;
  }
  
  return [super canPerformAction:action withSender:sender];
}

-(void)paste:(id)sender {
  [super paste:sender];
  
  UIPasteboard *pasteboard = [UIPasteboard generalPasteboard];
  if (pasteboard.hasURLs || pasteboard.hasStrings || pasteboard.hasColors) {
    return;
  }
  
  NSArray<NSDictionary *> *files = [pasteboard getCopiedFiles];
  if (files != nil && files.count > 0) {
    [OnPasteEventManager pasteFiles:files];
  }

  // Dismiss contextual menu
  [self resignFirstResponder];
}

@end
