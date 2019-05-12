//
//  EventEmitterModule.m
//  Mattermost
//
// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
//

#import "EventEmitterModule.h"

@implementation EventEmitterModule
{
  bool hasListeners;
}

RCT_EXPORT_MODULE();

- (void)startObserving
{
  hasListeners = YES;

  [[NSNotificationCenter defaultCenter] addObserver:self
                                           selector:@selector(handleHardwareEnter:)
                                               name:@"hardwareEnter"
                                             object:nil];
}

- (void)stopObserving
{
  [[NSNotificationCenter defaultCenter] removeObserver:self];
  
  hasListeners = NO;
}

- (NSArray<NSString *> *)supportedEvents
{
  return @[@"hardwareEnter"];
}

- (void)handleHardwareEnter:(NSNotification *)notification
{
  if (hasListeners) {
    @try {
      [self sendEventWithName:@"hardwareEnter" body:nil];
    } @catch (NSException *exception) {
      NSLog(@"Error sending event hardwareEnter to JS details=%@", exception.reason);
    }
  }
}

+ (void)emitEventWithName:(NSString *)name
{
  [[NSNotificationCenter defaultCenter] postNotificationName:name
                                                      object:self
                                                    userInfo:nil];
}

@end
