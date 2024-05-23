#import "Foundation/Foundation.h"
#import <React/RCTEventEmitter.h>
#import <React/RCTConvert.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import "RNUtilsSpec.h"

@interface RNUtils : RCTEventEmitter <NativeRnutilsSpec>
#else
#import <React/RCTBridgeModule.h>

@interface RNUtils : RCTEventEmitter <RCTBridgeModule>
#endif

@end
