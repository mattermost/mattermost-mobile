//
//  Watch.h
//  Mattermost
//
// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
//

#import <WatchConnectivity/WatchConnectivity.h>
#import <React/RCTBridgeModule.h>

@interface Watch : NSObject <RCTBridgeModule, WCSessionDelegate>

@property (atomic, readwrite) NSString* url;
@property (atomic, readwrite) NSString* token;
@property (atomic, strong) WCSession* session;

@end
