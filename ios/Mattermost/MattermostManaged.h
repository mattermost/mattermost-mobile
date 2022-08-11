//
//  MattermostManaged.h
//  Mattermost
//
// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
//

#import <React/RCTBridgeModule.h>
#import <React/RCTUtils.h>
#import <GameController/GameController.h>

@interface MattermostManaged : NSObject <RCTBridgeModule>
@property (nonatomic) NSUserDefaults *sharedUserDefaults;

@end
