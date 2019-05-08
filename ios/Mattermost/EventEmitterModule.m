//
//  EventEmitterModule.m
//  Mattermost
//
// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
//

#import "EventEmitterModule.h"

@implementation EventEmitterModule

RCT_EXPORT_MODULE();

- (void)startObserving
{
  [[NSNotificationCenter defaultCenter] addObserver:self
                                           selector:@selector(handleHardwareEnter:)
                                               name:@"hardwareEnter"
                                             object:nil];
}

- (void)stopObserving
{
  [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (NSArray<NSString *> *)supportedEvents
{
  return @[@"hardwareEnter"];
}

- (void)handleHardwareEnter:(NSNotification *)notification
{
  [self sendEventWithName:@"hardwareEnter"
                     body:notification.userInfo];
}

+ (void)emitEventWithName:(NSString *)name
{
  [[NSNotificationCenter defaultCenter] postNotificationName:name
                                                      object:self
                                                    userInfo:nil];
}

@end
