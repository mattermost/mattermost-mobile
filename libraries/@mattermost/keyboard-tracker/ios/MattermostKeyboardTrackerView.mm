#ifdef RCT_NEW_ARCH_ENABLED
#import "MattermostKeyboardTrackerView.h"
#import "KeyboardTrackingView.h"

#import <react/renderer/components/MattermostKeyboardTrackerSpec/ComponentDescriptors.h>
#import <react/renderer/components/MattermostKeyboardTrackerSpec/EventEmitters.h>
#import <react/renderer/components/MattermostKeyboardTrackerSpec/Props.h>
#import <react/renderer/components/MattermostKeyboardTrackerSpec/RCTComponentViewHelpers.h>

#import "RCTFabricComponentsPlugins.h"
#import "RCTConversions.h"

using namespace facebook::react;

@interface MattermostKeyboardTrackerView () <RCTMattermostKeyboardTrackerViewViewProtocol>

@end

@implementation MattermostKeyboardTrackerView {
    KeyboardTrackingView * _view;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
    return concreteComponentDescriptorProvider<MattermostKeyboardTrackerViewComponentDescriptor>();
}

-(std::shared_ptr<const MattermostKeyboardTrackerViewEventEmitter>)getEventEmitter {
    if (!self->_eventEmitter) {
        return nullptr;
    }
    
    assert(std::dynamic_pointer_cast<MattermostKeyboardTrackerViewEventEmitter const>(self->_eventEmitter));
    return std::dynamic_pointer_cast<MattermostKeyboardTrackerViewEventEmitter const>(self->_eventEmitter);
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const MattermostKeyboardTrackerViewProps>();
    _props = defaultProps;

    _view = [[KeyboardTrackingView alloc] init];
      [self _setOnKeyboardWillShow];

    self.contentView = _view;
  }

  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
    const auto &oldViewProps = *std::static_pointer_cast<MattermostKeyboardTrackerViewProps const>(_props);
    const auto &newViewProps = *std::static_pointer_cast<MattermostKeyboardTrackerViewProps const>(props);
    
    if (oldViewProps.scrollBehavior != newViewProps.scrollBehavior) {
        std::string behaviorString = toString(newViewProps.scrollBehavior);
        KeyboardTrackingScrollBehavior scrollBehavior = KeyboardTrackingScrollBehaviorFromString([NSString stringWithUTF8String:behaviorString.c_str()]);
        _view.scrollBehavior = scrollBehavior;
    }
    
    if (oldViewProps.revealKeyboardInteractive != newViewProps.revealKeyboardInteractive) {
        _view.revealKeyboardInteractive = newViewProps.revealKeyboardInteractive;
    }

    if (oldViewProps.manageScrollView != newViewProps.manageScrollView) {
        _view.manageScrollView = newViewProps.manageScrollView;
    }
    
    if (oldViewProps.requiresSameParentToManageScrollView != newViewProps.requiresSameParentToManageScrollView) {
        _view.requiresSameParentToManageScrollView = newViewProps.requiresSameParentToManageScrollView;
    }
    
    if (oldViewProps.addBottomView != newViewProps.addBottomView) {
        _view.addBottomView = newViewProps.addBottomView;
    }
    
    if (oldViewProps.scrollToFocusedInput != newViewProps.scrollToFocusedInput) {
        _view.scrollToFocusedInput = newViewProps.scrollToFocusedInput;
    }
    
    if (oldViewProps.allowHitsOutsideBounds != newViewProps.allowHitsOutsideBounds) {
        _view.allowHitsOutsideBounds = newViewProps.allowHitsOutsideBounds;
    }
    
    if (oldViewProps.normalList != newViewProps.normalList) {
        _view.normalList = newViewProps.normalList;
    }
    
    if (oldViewProps.viewInitialOffsetY != newViewProps.viewInitialOffsetY) {
        _view.viewInitialOffsetY =  newViewProps.viewInitialOffsetY;
    }
    
    if (oldViewProps.scrollViewNativeID != newViewProps.scrollViewNativeID) {
        _view.scrollViewNativeID = RCTNSStringFromString(newViewProps.scrollViewNativeID);
    }
    
    if (oldViewProps.accessoriesContainerID != newViewProps.accessoriesContainerID) {
        _view.accessoriesContainerID = RCTNSStringFromString(newViewProps.accessoriesContainerID);
        
    }
    
    if (oldViewProps.backgroundColor != newViewProps.backgroundColor) {
        [_view setBottomViewBackgroundColor:RCTUIColorFromSharedColor(newViewProps.backgroundColor)];
    }

    [super updateProps:props oldProps:oldProps];
}

- (void)handleCommand:(nonnull const NSString *)commandName args:(nonnull const NSArray *)args { 
    RCTMattermostKeyboardTrackerViewHandleCommand(self, commandName, args);
}

-(void)_setOnKeyboardWillShow{
    _view.onKeyboardWillShow = ^(NSDictionary *body) {
        const auto eventEmitter = [self getEventEmitter];
        if (eventEmitter) {
            eventEmitter->onKeyboardWillShow(MattermostKeyboardTrackerViewEventEmitter::OnKeyboardWillShow{
                .trackingViewHeight = [body[@"trackingViewHeight"] doubleValue],
                .keyboardHeight = [body[@"keyboardHeight"] doubleValue],
                .contentTopInset = [body[@"contentTopInset"] doubleValue],
                .animationDuration = [body[@"animationDuration"] doubleValue],
                .keyboardFrameEndHeight = (CGFloat)[body[@"keyboardFrameEndHeight"] doubleValue],
            });
        }
    };
}

Class<RCTComponentViewProtocol> MattermostKeyboardTrackerViewCls(void)
{
    return MattermostKeyboardTrackerView.class;
}

- (void)pauseTracking:(nonnull NSString *)scrollViewNativeID { 
    [_view pauseTracking:scrollViewNativeID];
}

- (void)resetScrollView:(nonnull NSString *)scrollViewNativeID { 
    [_view resetScrollView:scrollViewNativeID];
}

- (void)resumeTracking:(nonnull NSString *)scrollViewNativeID { 
    [_view resumeTracking:scrollViewNativeID];
}

- (void)scrollToStart { 
    [_view scrollToStart];
}


#pragma utils

KeyboardTrackingScrollBehavior KeyboardTrackingScrollBehaviorFromString(NSString *string) {
    if ([string isEqualToString:@"KeyboardTrackingScrollBehaviorNone"]) {
        return KeyboardTrackingScrollBehaviorNone;
    } else if ([string isEqualToString:@"KeyboardTrackingScrollBehaviorScrollToBottomInvertedOnly"]) {
        return KeyboardTrackingScrollBehaviorScrollToBottomInvertedOnly;
    } else if ([string isEqualToString:@"KeyboardTrackingScrollBehaviorFixedOffset"]) {
        return KeyboardTrackingScrollBehaviorFixedOffset;
    } else {
        // Handle the case where the string doesn't match any known value
        // You can choose to return a default value or raise an exception
        return KeyboardTrackingScrollBehaviorNone; // Default value
    }
}

@end
#endif
