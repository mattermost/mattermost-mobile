//
//  MattermostManaged.h
//  Mattermost
//
// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
//

#import <React/RCTBridgeModule.h>


@interface MattermostManaged : NSObject <RCTBridgeModule>
- (NSUserDefaults *)bucketByName:(NSString*)name;
+ (void)sendConfigChangedEvent;

@end
