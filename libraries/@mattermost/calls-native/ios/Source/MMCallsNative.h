// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

#import <Foundation/Foundation.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTConvert.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import "MMCallsNativeSpec.h"

@interface MMCallsNative : RCTEventEmitter <NativeMMCallsNativeSpec>
#else
#import <React/RCTBridgeModule.h>

@interface MMCallsNative : RCTEventEmitter <RCTBridgeModule>
#endif

@end
