//
//  EventEmitterModule.h
//  Mattermost
//
// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
//

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface EventEmitterModule : RCTEventEmitter <RCTBridgeModule>
+ (void)emitEventWithName:(NSString *)name;
@end
