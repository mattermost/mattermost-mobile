//
//  MattermostManaged.h
//  Mattermost
//
// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
//

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTUtils.h>

@interface MattermostManaged : RCTEventEmitter <RCTBridgeModule>
@property (nonatomic) NSUserDefaults *sharedUserDefaults;
+ (void)sendConfigChangedEvent;

@end
