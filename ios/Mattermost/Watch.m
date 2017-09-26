//
//  Watch.m
//  Mattermost
//
// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
//

#import <React/RCTBridge.h>
#import "Watch.h"

@implementation Watch

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(setCredentials:(NSString*)url token:(NSString*)token) {
  if ([self.url isEqualToString:url] && [self.token isEqualToString:token]) {
    return;
  }
  self.url = url;
  self.token = token;
  [self sendCredentials];
}

- (void)session:(WCSession *)session activationDidCompleteWithState:(WCSessionActivationState)activationState error:(NSError *)error {
  if (session.activationState == WCSessionActivationStateActivated) {
    [self sendCredentials];
  }
}

- (BOOL)readySession {
  if (!WCSession.isSupported) {
    return NO;
  }
  self.session = WCSession.defaultSession;
  self.session.delegate = self;
  if (self.session.activationState == WCSessionActivationStateActivated) {
    return YES;
  }
  [self.session activateSession];
  return NO;
}

- (void)sendCredentials {
  if ([self readySession]) {
    [self.session sendMessage:@{@"credentials": @{@"token": self.token, @"url": self.url}} replyHandler:nil errorHandler:nil];
  }
}

@end
