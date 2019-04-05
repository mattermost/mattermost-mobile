//
//  ModuleWithEmitter.m
//  Mattermost
//
// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
//

#import "EventEmitModule.h"

@implementation EventEmitModule

RCT_EXPORT_MODULE();

- (void)startObserving
{
  [[NSNotificationCenter defaultCenter] addObserver:self
                                           selector:@selector(handleEnter:)
                                               name:@"handleIosEnter"
                                             object:nil];
}

- (void)stopObserving
{
  [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (NSArray<NSString *> *)supportedEvents
{
  return @[@"handleIosEnter"];
}

- (void)handleEnter:(NSNotification *)notification
{
  [self sendEventWithName:@"handleIosEnter"
                     body:notification.userInfo];
}

+ (void)emitEventWithName:(NSString *)name andPayload:(NSDictionary *)payload
{
  [[NSNotificationCenter defaultCenter] postNotificationName:name
                                                      object:self
                                                    userInfo:payload];
}

@end
