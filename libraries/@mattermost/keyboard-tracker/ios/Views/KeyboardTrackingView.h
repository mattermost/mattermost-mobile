#import <Foundation/Foundation.h>
#import <React/RCTComponent.h>

#import "ObservingInputAccessoryView.h"

typedef NS_ENUM(NSUInteger, KeyboardTrackingScrollBehavior) {
    KeyboardTrackingScrollBehaviorNone,
    KeyboardTrackingScrollBehaviorScrollToBottomInvertedOnly,
    KeyboardTrackingScrollBehaviorFixedOffset
};

@interface KeyboardTrackingView : UIView
{
    NSMapTable *_inputViewsMap;
    ObservingInputAccessoryView *_observingInputAccessoryView;
    UIView *_bottomView;
    CGFloat _bottomViewHeight;
}

@property (nonatomic) NSMutableDictionary* _Nullable rctScrollViewsArray;
@property (nonatomic, strong) UIScrollView * _Nullable scrollViewToManage;
@property (nonatomic) BOOL scrollIsInverted;
@property (nonatomic) BOOL revealKeyboardInteractive;
@property (nonatomic) BOOL isDraggingScrollView;
@property (nonatomic) BOOL manageScrollView;
@property (nonatomic) BOOL requiresSameParentToManageScrollView;
@property (nonatomic) NSUInteger deferedInitializeAccessoryViewsCount;
@property (nonatomic) CGFloat originalHeight;
@property (nonatomic) KeyboardTrackingScrollBehavior scrollBehavior;
@property (nonatomic) BOOL addBottomView;
@property (nonatomic) BOOL scrollToFocusedInput;
@property (nonatomic) BOOL allowHitsOutsideBounds;

@property (nonatomic) BOOL normalList;
@property (nonatomic) NSString* _Nullable scrollViewNativeID;
@property (nonatomic) CGFloat initialOffsetY;
@property (nonatomic) CGFloat viewInitialOffsetY;
@property (nonatomic) BOOL initialOffsetIsSet;
@property (nonatomic) BOOL paused;
@property (nonatomic, strong) UIView* _Nullable accessoriesContainer;
@property (nonatomic) NSString* _Nullable accessoriesContainerID;
@property (nonatomic, copy, nullable) RCTDirectEventBlock onKeyboardWillShow;

-(void)setBottomViewBackgroundColor:(UIColor* _Nullable) color;
-(void)resetScrollView:(NSString* _Nullable) scrollViewNativeID;
-(void)pauseTracking:(NSString* _Nullable) scrollViewNativeID;
-(void)resumeTracking:(NSString* _Nullable) scrollViewNativeID;
-(void)scrollToStart;
@end

