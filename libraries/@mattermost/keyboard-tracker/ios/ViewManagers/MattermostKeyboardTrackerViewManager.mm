#import <React/RCTViewManager.h>
#import <React/RCTUIManager.h>
#import "RCTBridge.h"
#import "KeyboardTrackingView.h"

@interface MattermostKeyboardTrackerViewManager : RCTViewManager
@property (nonatomic, nullable, strong) RCTDirectEventBlock keyboardWillShow;
@end

@implementation RCTConvert (KeyboardTrackingScrollBehavior)
RCT_ENUM_CONVERTER(KeyboardTrackingScrollBehavior, (@{ @"KeyboardTrackingScrollBehaviorNone": @(KeyboardTrackingScrollBehaviorNone),
                                                       @"KeyboardTrackingScrollBehaviorScrollToBottomInvertedOnly": @(KeyboardTrackingScrollBehaviorScrollToBottomInvertedOnly),
                                                       @"KeyboardTrackingScrollBehaviorFixedOffset": @(KeyboardTrackingScrollBehaviorFixedOffset)}),
                   KeyboardTrackingScrollBehaviorNone, unsignedIntegerValue)
@end

@implementation MattermostKeyboardTrackerViewManager

RCT_EXPORT_MODULE(MattermostKeyboardTrackerView)

#ifndef RCT_NEW_ARCH_ENABLED
- (UIView *)view
{
    return [[KeyboardTrackingView alloc] init];
}
#endif

RCT_CUSTOM_VIEW_PROPERTY(scrollBehavior, NSString, KeyboardTrackingView) {
    KeyboardTrackingScrollBehavior behavior = [RCTConvert KeyboardTrackingScrollBehavior:json];
    [view setScrollBehavior:behavior];
}

RCT_CUSTOM_VIEW_PROPERTY(revealKeyboardInteractive, BOOL, KeyboardTrackingView) {
    [view setRevealKeyboardInteractive:json];
}

RCT_CUSTOM_VIEW_PROPERTY(manageScrollView, BOOL, KeyboardTrackingView) {
    [view setManageScrollView:json];
}

RCT_CUSTOM_VIEW_PROPERTY(requiresSameParentToManageScrollView, BOOL, KeyboardTrackingView) {
    [view setRequiresSameParentToManageScrollView:json];
}

RCT_CUSTOM_VIEW_PROPERTY(addBottomView, BOOL, KeyboardTrackingView) {
    [view setAddBottomView:json];
}

RCT_CUSTOM_VIEW_PROPERTY(scrollToFocusedInput, BOOL, KeyboardTrackingView) {
    [view setScrollToFocusedInput:json];
}

RCT_CUSTOM_VIEW_PROPERTY(allowHitsOutsideBounds, BOOL, KeyboardTrackingView) {
    [view setAllowHitsOutsideBounds:json];
}

RCT_CUSTOM_VIEW_PROPERTY(normalList, BOOL, KeyboardTrackingView) {
    [view setNormalList:json];
}

RCT_CUSTOM_VIEW_PROPERTY(viewInitialOffsetY, CGFloat, KeyboardTrackingView) {
    [view setViewInitialOffsetY:[RCTConvert CGFloat: json]];
}

RCT_CUSTOM_VIEW_PROPERTY(scrollViewNativeID, NSString, KeyboardTrackingView) {
    [view setScrollViewNativeID:json];
}

RCT_CUSTOM_VIEW_PROPERTY(accessoriesContainerID, NSString, KeyboardTrackingView) {
    [view setAccessoriesContainerID:json];
}

RCT_CUSTOM_VIEW_PROPERTY(backgroundColor, NSString, KeyboardTrackingView)
{
    [view setBottomViewBackgroundColor:[RCTConvert UIColor:json]];
}

RCT_EXPORT_VIEW_PROPERTY(onKeyboardWillShow, RCTBubblingEventBlock)

#pragma Commands

RCT_EXPORT_METHOD(resetScrollView:(nonnull NSNumber *)reactTag scrollViewNativeID:(NSString *) scrollViewNativeID) {
    [self.bridge.uiManager addUIBlock:^(RCTUIManager *uiManager, NSDictionary<NSNumber *, UIView *> *viewRegistry) {
        KeyboardTrackingView *view = (KeyboardTrackingView *)viewRegistry[reactTag];
        if (!view || ![view isKindOfClass:[KeyboardTrackingView class]]) {
            RCTLogError(@"Error: cannot find KeyboardTrackingView with tag #%@", reactTag);
            return;
        }
        [view resetScrollView:scrollViewNativeID];
    }];
}

RCT_EXPORT_METHOD(pauseTracking:(nonnull NSNumber *)reactTag scrollViewNativeID:(NSString*)scrollViewNativeID) {
    [self.bridge.uiManager addUIBlock:^(RCTUIManager *uiManager, NSDictionary<NSNumber *, UIView *> *viewRegistry) {
        KeyboardTrackingView *view = (KeyboardTrackingView *)viewRegistry[reactTag];
        if (!view || ![view isKindOfClass:[KeyboardTrackingView class]]) {
            RCTLogError(@"Error: cannot find KeyboardTrackingView with tag #%@", reactTag);
            return;
        }
        [view pauseTracking:scrollViewNativeID];
    }];
}

RCT_EXPORT_METHOD(resumeTracking:(nonnull NSNumber *)reactTag scrollViewNativeID:(NSString*)scrollViewNativeID) {
    [self.bridge.uiManager addUIBlock:^(RCTUIManager *uiManager, NSDictionary<NSNumber *, UIView *> *viewRegistry) {
        KeyboardTrackingView *view = (KeyboardTrackingView *)viewRegistry[reactTag];
        if (!view || ![view isKindOfClass:[KeyboardTrackingView class]]) {
            RCTLogError(@"Error: cannot find KeyboardTrackingView with tag #%@", reactTag);
            return;
        }
        [view resumeTracking:scrollViewNativeID];
    }];
}

RCT_EXPORT_METHOD(scrollToStart:(nonnull NSNumber *)reactTag)
{
    [self.bridge.uiManager addUIBlock:^(RCTUIManager *uiManager, NSDictionary<NSNumber *, UIView *> *viewRegistry) {
        KeyboardTrackingView *view = (KeyboardTrackingView *)viewRegistry[reactTag];
        if (!view || ![view isKindOfClass:[KeyboardTrackingView class]]) {
            RCTLogError(@"Error: cannot find KeyboardTrackingView with tag #%@", reactTag);
            return;
        }
        [view scrollToStart];
    }];
}

@end
