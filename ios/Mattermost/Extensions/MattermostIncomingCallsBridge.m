// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

#import <React/RCTBridgeModule.h>
#import "Mattermost-Swift.h"

@interface MattermostIncomingCallsBridge : NSObject <RCTBridgeModule>
@end

@implementation MattermostIncomingCallsBridge

RCT_EXPORT_MODULE(MattermostIncomingCallsBridge);

RCT_EXPORT_METHOD(endIncomingCallKit:(NSString *)callId)
{
    if (callId.length == 0) {
        return;
    }
    dispatch_async(dispatch_get_main_queue(), ^{
        [MattermostIncomingCalls.shared endIncomingCallKitWithCallId:callId];
    });
}

@end
