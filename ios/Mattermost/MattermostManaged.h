//
//  MattermostManaged.h
//  Mattermost
//
// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
//

#import <React/RCTEventEmitter.h>
#import <React/RCTBridgeModule.h>


@interface MattermostManaged : RCTEventEmitter <RCTBridgeModule>

+ (void)sendConfigChangedEvent;

@end
