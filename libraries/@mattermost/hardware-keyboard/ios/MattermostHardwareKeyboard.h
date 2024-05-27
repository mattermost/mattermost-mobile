
#import <React/RCTEventEmitter.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import "MattermostHardwareKeyboardSpec.h"

@interface MattermostHardwareKeyboard : RCTEventEmitter <NativeMattermostHardwareKeyboardSpec>
#else
#import <React/RCTBridgeModule.h>

@interface MattermostHardwareKeyboard : RCTEventEmitter <RCTBridgeModule>
#endif

@end
