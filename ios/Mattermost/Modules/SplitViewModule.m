#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_REMAP_MODULE(SplitView, SplitViewModule, RCTEventEmitter)
RCT_EXTERN_METHOD(supportedEvents)
RCT_EXTERN_METHOD(startObserving)
RCT_EXTERN_METHOD(stopObserving)
RCT_EXTERN__BLOCKING_SYNCHRONOUS_METHOD(isRunningInSplitView)
RCT_EXTERN_METHOD(unlockOrientation)
RCT_EXTERN_METHOD(lockPortrait)
@end
