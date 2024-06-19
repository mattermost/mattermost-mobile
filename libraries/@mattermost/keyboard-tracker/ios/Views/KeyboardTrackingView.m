#import "KeyboardTrackingView.h"
#import <React/RCTUIManager.h>
#import <React/RCTScrollView.h>

#import "UIResponder+FirstResponder.h"
#import "ObservingInputAccessoryView.h"

#import <objc/runtime.h>

NSUInteger const kInputViewKey = 101010;
NSUInteger const kMaxDeferedInitializeAccessoryViews = 15;
NSInteger  const kTrackingViewNotFoundErrorCode = 1;
NSInteger  const kBottomViewHeight = 34;

@interface KeyboardTrackingView () <ObservingInputAccessoryViewDelegate, UIScrollViewDelegate>
@end

@implementation KeyboardTrackingView
-(instancetype)init
{
    self = [super init];
    
    if (self)
    {
        [self addObserver:self forKeyPath:@"bounds" options:NSKeyValueObservingOptionInitial | NSKeyValueObservingOptionNew context:NULL];
        _inputViewsMap = [NSMapTable weakToWeakObjectsMapTable];
        _deferedInitializeAccessoryViewsCount = 0;
        _rctScrollViewsArray = [[NSMutableDictionary alloc] init];
        
        _observingInputAccessoryView = [ObservingInputAccessoryView new];
        _observingInputAccessoryView.delegate = self;
        
        _initialOffsetY = 0;
        _initialOffsetIsSet = NO;
        _viewInitialOffsetY = 0;
        
        _manageScrollView = YES;
        _allowHitsOutsideBounds = NO;
        _requiresSameParentToManageScrollView = YES;
        
        _bottomViewHeight = kBottomViewHeight;
        
        self.addBottomView = NO;
        self.scrollToFocusedInput = NO;
        self.paused = NO;
        
        [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(rctContentDidAppearNotification:) name:RCTContentDidAppearNotification object:nil];
    }
    
    return self;
}

-(RCTRootView*)getRootView
{
    UIView *view = self;
    while (view.superview != nil)
    {
        view = view.superview;
        if ([view isKindOfClass:[RCTRootView class]])
            break;
    }
    
    if ([view isKindOfClass:[RCTRootView class]])
    {
        return (RCTRootView*)view;
    }
    return nil;
}

- (UIView *)hitTest:(CGPoint)point withEvent:(UIEvent *)event {
    if (!_allowHitsOutsideBounds) {
        return [super hitTest:point withEvent:event];
    }
    
    if (self.isHidden || self.alpha == 0 || self.clipsToBounds) {
        return nil;
    }
    
    UIView *subview = [super hitTest:point withEvent:event];
    if (subview == nil) {
        NSArray<UIView*>* allSubviews = [self getBreadthFirstSubviewsForView:self];
        for (UIView *tmpSubview in allSubviews) {
            CGPoint pointInSubview = [self convertPoint:point toView:tmpSubview];
            if ([tmpSubview pointInside:pointInSubview withEvent:event]) {
                subview = tmpSubview;
                break;
            }
        }
    }
    
    return subview;
}

-(void)layoutSubviews
{
    [super layoutSubviews];
    [self updateBottomViewFrame];
}

- (void)initializeAccessoryViewsAndHandleInsets
{
    NSArray<UIView*>* allSubviews = [self getBreadthFirstSubviewsForView:[self getRootView]];
    
    for (UIView* subview in allSubviews)
    {
        if(subview.nativeID) {
            NSLog(@"self.accessoriesContainerID %@ %@", self.accessoriesContainerID, subview.nativeID);
        }

        if (subview.nativeID && [subview.nativeID isEqualToString:self.accessoriesContainerID]) {
            NSLog(@"SuperView ID: %@", subview.nativeID);
            _accessoriesContainer = subview;
        }

        if(_manageScrollView)
        {
            if(_scrollViewToManage == nil)
            {
                if([subview isKindOfClass:[RCTScrollView class]])
                {
                    RCTScrollView *scrollView = (RCTScrollView*)subview;
                
                    if (subview.nativeID && [subview.nativeID isEqualToString:self.scrollViewNativeID]) {
                        [_rctScrollViewsArray setObject:scrollView forKey:subview.nativeID];
                        _scrollViewToManage = scrollView.scrollView;
                    }
                }
            }
        }
        
        if ([subview isKindOfClass:NSClassFromString(@"RCTTextField")])
        {
            UITextField *textField = nil;
            Ivar backedTextInputIvar = class_getInstanceVariable([subview class], "_backedTextInput");
            if (backedTextInputIvar != NULL)
            {
                textField = [subview valueForKey:@"_backedTextInput"];
            }
            else if([subview isKindOfClass:[UITextField class]])
            {
                textField = (UITextField*)subview;
            }
            [self setupTextField:textField];
        }
        else if ([subview isKindOfClass:NSClassFromString(@"RCTUITextField")] && [subview isKindOfClass:[UITextField class]])
        {
            [self setupTextField:(UITextField*)subview];
        }
        else if ([subview isKindOfClass:NSClassFromString(@"RCTMultilineTextInputView")])
        {
            [self setupTextView:[subview valueForKey:@"_backedTextInputView"]];
        }
        else if ([subview isKindOfClass:NSClassFromString(@"RCTTextView")])
        {
            UITextView *textView = nil;
            Ivar backedTextInputIvar = class_getInstanceVariable([subview class], "_backedTextInput");
            if (backedTextInputIvar != NULL)
            {
                textView = [subview valueForKey:@"_backedTextInput"];
            }
            else if([subview isKindOfClass:[UITextView class]])
            {
                textView = (UITextView*)subview;
            }
            [self setupTextView:textView];
        }
        else if ([subview isKindOfClass:NSClassFromString(@"RCTUITextView")] && [subview isKindOfClass:[UITextView class]])
        {
            [self setupTextView:(UITextView*)subview];
        }
    }
    
    for (RCTScrollView *scrollView in [_rctScrollViewsArray allValues])
    {
        if(scrollView.scrollView == _scrollViewToManage)
        {
            [scrollView removeScrollListener:self];
            [scrollView addScrollListener:self];
            break;
        }
    }
    
#if __IPHONE_OS_VERSION_MAX_ALLOWED > __IPHONE_10_3
    if (@available(iOS 11.0, *)) {
        if (_scrollViewToManage != nil) {
            _scrollViewToManage.contentInsetAdjustmentBehavior = UIScrollViewContentInsetAdjustmentNever;
        }
    }
#endif
    
    [self _updateScrollViewInsets];
    
    _originalHeight = _observingInputAccessoryView.height;
    
    [self addBottomViewIfNecessary];
}

- (void)resetScrollView:(NSString*) scrollViewNativeID {
    for (RCTScrollView *scrollView in [_rctScrollViewsArray allValues])
    {
        [scrollView removeScrollListener:self];
    }
    [_rctScrollViewsArray removeAllObjects];
    _scrollViewToManage = nil;
    _scrollViewNativeID = scrollViewNativeID;

    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.1 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
        [self deferedInitializeAccessoryViewsAndHandleInsets];
        [self scrollToStart];
    });
}

-(void)pauseTracking:(NSString*) scrollViewNativeID {
    if ([self.scrollViewNativeID isEqualToString:scrollViewNativeID]) {
        _observingInputAccessoryView.delegate = nil;
        self.scrollViewToManage = nil;
        self.accessoriesContainer = nil;
        self.paused = YES;
    }
}

-(void)resumeTracking:(NSString*) scrollViewNativeID {
    if ([self.scrollViewNativeID isEqualToString:scrollViewNativeID]) {
        self.paused = NO;
        _observingInputAccessoryView.delegate = self;
        [self deferedInitializeAccessoryViewsAndHandleInsets];
    }
}

- (void)setupTextView:(UITextView*)textView
{
    if (textView != nil)
    {
        [textView setInputAccessoryView:_observingInputAccessoryView];
        [textView reloadInputViews];
        [_inputViewsMap setObject:textView forKey:@(kInputViewKey)];
    }
}

- (void)setupTextField:(UITextField*)textField
{
    if (textField != nil)
    {
        [textField setInputAccessoryView:_observingInputAccessoryView];
        [textField reloadInputViews];
        [_inputViewsMap setObject:textField forKey:@(kInputViewKey)];
    }
}

-(void) deferedInitializeAccessoryViewsAndHandleInsets
{
    if(self.window == nil)
    {
        return;
    }
    
    if (_observingInputAccessoryView.height == 0 && self.deferedInitializeAccessoryViewsCount < kMaxDeferedInitializeAccessoryViews)
    {
        self.deferedInitializeAccessoryViewsCount++;
        
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.1 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
            [self deferedInitializeAccessoryViewsAndHandleInsets];
        });
    }
    else
    {
        dispatch_async(dispatch_get_main_queue(), ^{
            [self initializeAccessoryViewsAndHandleInsets];
        });
    }
}

- (void)willMoveToWindow:(nullable UIWindow *)newWindow
{
    if (newWindow == nil && [ObservingInputAccessoryViewManager sharedInstance].activeObservingInputAccessoryView == _observingInputAccessoryView)
    {
        [ObservingInputAccessoryViewManager sharedInstance].activeObservingInputAccessoryView = nil;
    }
    else if (newWindow != nil)
    {
        [ObservingInputAccessoryViewManager sharedInstance].activeObservingInputAccessoryView = _observingInputAccessoryView;
    }
}

-(void)didMoveToWindow
{
    [super didMoveToWindow];
    
    self.deferedInitializeAccessoryViewsCount = 0;
    
    [self deferedInitializeAccessoryViewsAndHandleInsets];
}

-(void)dealloc
{
    [self removeObserver:self forKeyPath:@"bounds"];
}

- (void)observeValueForKeyPath:(NSString *)keyPath ofObject:(id)object change:(NSDictionary<NSKeyValueChangeKey,id> *)change context:(void *)context
{
    if (self.paused) {
        return;
    }
    _observingInputAccessoryView.height = self.bounds.size.height;
}

- (void)observingInputAccessoryViewKeyboardWillDisappear:(ObservingInputAccessoryView *)observingInputAccessoryView
{
    if (self.paused) {
        return;
    }

    _bottomViewHeight = [self getBottomSafeArea];
    [self updateBottomViewFrame];
}

- (NSArray*)getBreadthFirstSubviewsForView:(UIView*)view
{
    if(view == nil)
    {
        return nil;
    }
    
    NSMutableArray *allSubviews = [NSMutableArray new];
    NSMutableArray *queue = [NSMutableArray new];
    
    [allSubviews addObject:view];
    [queue addObject:view];
    
    while ([queue count] > 0) {
        UIView *current = [queue lastObject];
        [queue removeLastObject];
        
        for (UIView *n in current.subviews)
        {
            [allSubviews addObject:n];
            [queue insertObject:n atIndex:0];
        }
    }
    return allSubviews;
}

- (NSArray*)getAllReactSubviewsForView:(UIView*)view
{
    NSMutableArray *allSubviews = [NSMutableArray new];
    for (UIView *subview in view.reactSubviews)
    {
        [allSubviews addObject:subview];
        [allSubviews addObjectsFromArray:[self getAllReactSubviewsForView:subview]];
    }
    return allSubviews;
}

- (void)_updateScrollViewInsets
{
    if(self.scrollViewToManage != nil && !self.paused)
    {
        if (!_initialOffsetIsSet) {
            self.initialOffsetY = self.scrollViewToManage.contentOffset.y;
            _initialOffsetIsSet = YES;
        }

        if (_observingInputAccessoryView.keyboardState != KeyboardStateWillHide && _observingInputAccessoryView.keyboardState != KeyboardStateHidden) {
            [self.scrollViewToManage setContentOffset:CGPointMake(self.scrollViewToManage.contentOffset.x, self.initialOffsetY) animated:NO];
        }

        UIEdgeInsets insets = self.scrollViewToManage.contentInset;
        CGFloat bottomSafeArea = [self getBottomSafeArea];
        CGFloat bottomInset = MAX(self.bounds.size.height, _observingInputAccessoryView.keyboardHeight + _observingInputAccessoryView.height);
        
        CGFloat originalBottomInset = self.scrollIsInverted ? insets.top : insets.bottom;
        CGPoint originalOffset = self.scrollViewToManage.contentOffset;
        CGFloat keyboardHeight = _observingInputAccessoryView.keyboardHeight;
        
        bottomInset += (keyboardHeight == 0 ? bottomSafeArea : 0);
        if(self.scrollIsInverted)
        {
            insets.top = bottomInset;
        }
        else
        {
            insets.bottom = keyboardHeight;
        }
        self.scrollViewToManage.contentInset = insets;
        
        if(self.scrollBehavior == KeyboardTrackingScrollBehaviorScrollToBottomInvertedOnly && _scrollIsInverted)
        {
            BOOL firstTime = _observingInputAccessoryView.keyboardHeight == 0 && _observingInputAccessoryView.keyboardState == KeyboardStateHidden;
            BOOL willOpen = _observingInputAccessoryView.keyboardHeight != 0 && _observingInputAccessoryView.keyboardState == KeyboardStateHidden;
            BOOL isOpen = _observingInputAccessoryView.keyboardHeight != 0 && _observingInputAccessoryView.keyboardState == KeyboardStateShown;
            if(firstTime || willOpen || (isOpen && !self.isDraggingScrollView))
            {
                [self.scrollViewToManage setContentOffset:CGPointMake(self.scrollViewToManage.contentOffset.x, self.scrollViewToManage.contentOffset.y) animated:!firstTime];
            }
        }
        else if(self.scrollBehavior == KeyboardTrackingScrollBehaviorFixedOffset && !self.isDraggingScrollView)
        {
            CGFloat insetsDiff = (bottomInset - originalBottomInset) * (self.scrollIsInverted ? -1 : 1);
            self.scrollViewToManage.contentOffset = CGPointMake(originalOffset.x, originalOffset.y + insetsDiff);
        }
        
        CGFloat kHeight = _observingInputAccessoryView.keyboardHeight;
        if (kHeight != 0 && (_observingInputAccessoryView.keyboardState == KeyboardStateShown || _observingInputAccessoryView.keyboardState == KeyboardStateWillShow)) {
                kHeight -= (bottomSafeArea + _viewInitialOffsetY);
        }

        CGFloat positionY = self.normalList ? 0 : kHeight;
        CGRect frame = CGRectMake(self.scrollViewToManage.frame.origin.x, positionY,
                                  self.scrollViewToManage.frame.size.width, self.scrollViewToManage.frame.size.height);
        self.scrollViewToManage.frame = frame;

        if (self.accessoriesContainer) {
            CGFloat containerPositionY = self.normalList ? 0 : kHeight;
            self.accessoriesContainer.bounds =  CGRectMake(self.accessoriesContainer.bounds.origin.x, containerPositionY,
                                                           self.accessoriesContainer.bounds.size.width, self.accessoriesContainer.bounds.size.height);
        }
    }
}

#pragma mark - bottom view

-(void)setAddBottomView:(BOOL)addBottomView
{
    _addBottomView = addBottomView;
    [self addBottomViewIfNecessary];
}

-(void)addBottomViewIfNecessary
{
    if (self.addBottomView && _bottomView == nil)
    {
        _bottomView = [UIView new];
        [self addSubview:_bottomView];
        [self updateBottomViewFrame];
    }
    else if (!self.addBottomView && _bottomView != nil)
    {
        [_bottomView removeFromSuperview];
        _bottomView = nil;
    }
}

-(void)updateBottomViewFrame
{
    if (_bottomView != nil)
    {
        _bottomView.frame = CGRectMake(0, self.frame.size.height, self.frame.size.width, _bottomViewHeight);
    }
}

-(void)setBottomViewBackgroundColor:(UIColor*) color {
    if (_bottomView != nil) {
        _bottomView.backgroundColor = color;
    }
}

#pragma mark - safe area

-(void)safeAreaInsetsDidChange
{
#if __IPHONE_OS_VERSION_MAX_ALLOWED > __IPHONE_10_3
    if (@available(iOS 11.0, *)) {
        [super safeAreaInsetsDidChange];
    }
#endif
    [self updateTransformAndInsets];
}

-(CGFloat)getBottomSafeArea
{
    CGFloat bottomSafeArea = 0;
#if __IPHONE_OS_VERSION_MAX_ALLOWED > __IPHONE_10_3
    if (@available(iOS 11.0, *)) {
        bottomSafeArea = self.superview ? self.superview.safeAreaInsets.bottom : self.safeAreaInsets.bottom;
    }
#endif
    return bottomSafeArea;
}

#pragma RCTRootView notifications

- (void) rctContentDidAppearNotification:(NSNotification*)notification
{
    dispatch_async(dispatch_get_main_queue(), ^{
        if(notification.object == [self getRootView] && self->_manageScrollView && self->_scrollViewToManage == nil)
        {
            [self initializeAccessoryViewsAndHandleInsets];
        }
    });
}

#pragma mark - ObservingInputAccessoryViewDelegate methods

-(void)updateTransformAndInsets
{
    if (self.paused) {
        return;
    }

    CGFloat bottomSafeArea = [self getBottomSafeArea];
    CGFloat accessoryTranslation = MIN(-bottomSafeArea, -(_observingInputAccessoryView.keyboardHeight - _viewInitialOffsetY));
    
    if (_observingInputAccessoryView.keyboardHeight <= bottomSafeArea) {
        _bottomViewHeight = [self getBottomSafeArea];
    } else if (_observingInputAccessoryView.keyboardState != KeyboardStateWillHide) {
        _bottomViewHeight = 0;
    }
    [self updateBottomViewFrame];
    
    self.transform = CGAffineTransformMakeTranslation(0, accessoryTranslation);
    [self _updateScrollViewInsets];
}

- (void)performScrollToFocusedInput
{
    if (_scrollViewToManage != nil && self.scrollToFocusedInput)
    {
        UIResponder *currentFirstResponder = [UIResponder currentFirstResponder];
        if (currentFirstResponder != nil && [currentFirstResponder isKindOfClass:[UIView class]])
        {
            UIView *reponderView = (UIView*)currentFirstResponder;
            if ([reponderView isDescendantOfView:_scrollViewToManage])
            {
                CGRect frame = [_scrollViewToManage convertRect:reponderView.frame fromView:reponderView];
                frame = CGRectMake(frame.origin.x, frame.origin.y, frame.size.width, frame.size.height + 20);
                [_scrollViewToManage scrollRectToVisible:frame animated:NO];
            }
        }
    }
}

- (void)observingInputAccessoryViewDidChangeFrame:(ObservingInputAccessoryView*)observingInputAccessoryView
{
    [self updateTransformAndInsets];
}

-(void) observingInputAccessoryViewKeyboardWillAppear:(ObservingInputAccessoryView *)observingInputAccessoryView keyboardDelta:(CGFloat)keyboardDelta animationDuration:(double)animationDuration keyboardFrameEndHeight:(CGFloat)keyboardFrameEndHeight {
    if (observingInputAccessoryView.keyboardHeight > 0) //prevent hiding the bottom view if an external keyboard is in use
    {
        _bottomViewHeight = 0;
        [self updateBottomViewFrame];
    }
    
    [self performScrollToFocusedInput];
    _onKeyboardWillShow(@{
        @"trackingViewHeight": [NSNumber numberWithDouble:self.bounds.size.height],
        @"keyboardHeight": [NSNumber numberWithDouble:[self getKeyboardHeight]],
        @"contentTopInset": [NSNumber numberWithDouble:[self getScrollViewTopContentInset]],
        @"animationDuration": [NSNumber numberWithDouble:animationDuration * 1000],
        @"keyboardFrameEndHeight": [NSNumber numberWithDouble:keyboardFrameEndHeight],
    });
}

#pragma mark - UIScrollViewDelegate methods

- (void)scrollViewDidScroll:(UIScrollView *)scrollView
{
    if(_observingInputAccessoryView.keyboardState != KeyboardStateHidden || !self.revealKeyboardInteractive)
    {
        return;
    }
    
    UIView *inputView = [_inputViewsMap objectForKey:@(kInputViewKey)];
    if (inputView != nil && scrollView.contentOffset.y * (self.scrollIsInverted ? -1 : 1) > (self.scrollIsInverted ? scrollView.contentInset.top : scrollView.contentInset.bottom) + 50 && ![inputView isFirstResponder])
    {
        for (UIGestureRecognizer *gesture in scrollView.gestureRecognizers)
        {
            if([gesture isKindOfClass:[UIPanGestureRecognizer class]])
            {
                gesture.enabled = NO;
                gesture.enabled = YES;
            }
        }
        
        [inputView reactFocus];
    }
}

- (void)scrollViewWillBeginDragging:(UIScrollView *)scrollView
{
    self.isDraggingScrollView = YES;
    _initialOffsetIsSet = NO;
    self.initialOffsetY = scrollView.contentOffset.y;
}

- (void)scrollViewWillEndDragging:(UIScrollView *)scrollView withVelocity:(CGPoint)velocity targetContentOffset:(inout CGPoint *)targetContentOffset
{
    self.isDraggingScrollView = NO;
}

- (void)scrollViewDidEndDragging:(UIScrollView *)scrollView willDecelerate:(BOOL)decelerate
{
    self.isDraggingScrollView = NO;
    self.initialOffsetY = scrollView.contentOffset.y;
}

- (void)scrollViewDidEndScrollingAnimation:(UIScrollView *)scrollView {
    self.initialOffsetY = scrollView.contentOffset.y;
}

- (void)scrollViewDidEndDecelerating:(UIScrollView *)scrollView {
    self.initialOffsetY = scrollView.contentOffset.y;
}

- (CGFloat)getKeyboardHeight
{
    return _observingInputAccessoryView ? _observingInputAccessoryView.keyboardHeight : 0;
}

-(CGFloat)getScrollViewTopContentInset
{
    return (self.scrollViewToManage != nil) ? -self.scrollViewToManage.contentInset.top : 0;
}

-(void)scrollToStart
{
    if (self.scrollViewToManage != nil)
    {
        [self.scrollViewToManage setContentOffset:CGPointMake(self.scrollViewToManage.contentOffset.x, -self.scrollViewToManage.contentInset.top) animated:YES];
    }
}
@end
