//
//  MattermostManaged.m
//  Mattermost
//
// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
//

#import <React/RCTBridge.h>
#import <React/RCTEventDispatcher.h>
#import "RCTUITextView.h"
#import "MattermostManaged.h"

@implementation MattermostManaged

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

@synthesize bridge = _bridge;

- (void)dealloc
{
  [[NSNotificationCenter defaultCenter] removeObserver:self];
  [[NSNotificationCenter defaultCenter] removeObserver:NSUserDefaultsDidChangeNotification];
}

- (void)setBridge:(RCTBridge *)bridge
{
  _bridge = bridge;
  [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(managedConfigDidChange:) name:@"managedConfigDidChange" object:nil];
  [[NSNotificationCenter defaultCenter] addObserverForName:NSUserDefaultsDidChangeNotification
                                                    object:nil
                                                     queue:[NSOperationQueue mainQueue] usingBlock:^(NSNotification *note) {
                                                       [self remoteConfigChanged];
                                                     }];
}

+ (void)sendConfigChangedEvent {
  [[NSNotificationCenter defaultCenter] postNotificationName:@"managedConfigDidChange"
                                                      object:self
                                                    userInfo:nil];
}

// The Managed app configuration dictionary pushed down from an MDM server are stored in this key.
static NSString * const configurationKey = @"com.apple.configuration.managed";

// The dictionary that is sent back to the MDM server as feedback must be stored in this key.
static NSString * const feedbackKey = @"com.apple.feedback.managed";


- (void)managedConfigDidChange:(NSNotification *)notification
{
  NSDictionary *response = [[NSUserDefaults standardUserDefaults] dictionaryForKey:configurationKey];
  [_bridge.eventDispatcher sendDeviceEventWithName:@"managedConfigDidChange" body:response];
}

- (void) remoteConfigChanged {
  NSDictionary *response = [[NSUserDefaults standardUserDefaults] dictionaryForKey:configurationKey];
  [_bridge.eventDispatcher sendDeviceEventWithName:@"managedConfigDidChange" body:response];
}

RCT_EXPORT_METHOD(getConfig:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  NSDictionary *response = [[NSUserDefaults standardUserDefaults] dictionaryForKey:configurationKey];
  if (response) {
    resolve(response);
  }
  else {
    NSError *error = [NSError errorWithDomain:@"Mattermost Managed" code:-1 userInfo:nil];
    reject(@"no managed configuration", @"The MDM vendor has not sent any Managed configuration", error);
  }
}

RCT_EXPORT_METHOD(quitApp)
{
  exit(0);
}

@end

@implementation RCTUITextView (DisableCopyPaste)

- (BOOL)canPerformAction:(SEL)action withSender:(id)sender
{
  NSDictionary *response = [[NSUserDefaults standardUserDefaults] dictionaryForKey:configurationKey];
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
  
  return [super canPerformAction:action withSender:sender];
}

@end
