#import "ObservingInputAccessoryView.h"

@implementation ObservingInputAccessoryViewManager

+(ObservingInputAccessoryViewManager*)sharedInstance
{
    static ObservingInputAccessoryViewManager *instance = nil;
    static dispatch_once_t observingInputAccessoryViewManagerOnceToken = 0;
    
    dispatch_once(&observingInputAccessoryViewManagerOnceToken,^
    {
        if (instance == nil)
        {
            instance = [ObservingInputAccessoryViewManager new];
        }
    });
    
    return instance;
}

@end

@implementation ObservingInputAccessoryView
{
    CGFloat _previousKeyboardHeight;
}

- (instancetype)init
{
	self = [super init];
	
	if(self)
	{
        self.userInteractionEnabled = NO;
        self.translatesAutoresizingMaskIntoConstraints = NO;
		self.autoresizingMask = UIViewAutoresizingFlexibleHeight;
        
        [self registerForKeyboardNotifications];
	}
	
	return self;
}

- (void) registerForKeyboardNotifications
{
    NSNotificationCenter *notificationCenter = [NSNotificationCenter defaultCenter];
    [notificationCenter addObserver:self selector:@selector(_keyboardWillShowNotification:) name:UIKeyboardWillShowNotification object:nil];
    [notificationCenter addObserver:self selector:@selector(_keyboardDidShowNotification:) name:UIKeyboardDidShowNotification object:nil];
    [notificationCenter addObserver:self selector:@selector(_keyboardWillHideNotification:) name:UIKeyboardWillHideNotification object:nil];
    [notificationCenter addObserver:self selector:@selector(_keyboardDidHideNotification:) name:UIKeyboardDidHideNotification object:nil];
    [notificationCenter addObserver:self selector:@selector(_keyboardWillChangeFrameNotification:) name:UIKeyboardWillChangeFrameNotification object:nil];
}

- (void)willMoveToSuperview:(UIView *)newSuperview
{
	if (self.superview)
	{
		[self.superview removeObserver:self forKeyPath:@"center"];
	}
	
	if (newSuperview != nil)
	{
		[newSuperview addObserver:self forKeyPath:@"center" options:NSKeyValueObservingOptionNew context:nil];
	}
	
	[super willMoveToSuperview:newSuperview];
}

- (void)observeValueForKeyPath:(NSString *)keyPath ofObject:(id)object change:(NSDictionary *)change context:(void *)context
{
	if ((object == self.superview) && ([keyPath isEqualToString:@"center"]))
	{
        CGFloat centerY = self.superview.center.y;
        
        if([keyPath isEqualToString:@"center"])
        {
            centerY = [change[NSKeyValueChangeNewKey] CGPointValue].y;
        }
        
        CGFloat boundsH = self.superview.bounds.size.height;
        
        _previousKeyboardHeight = _keyboardHeight;
		_keyboardHeight = MAX(0, self.window.bounds.size.height - (centerY - boundsH / 2) - self.intrinsicContentSize.height);
		
        [_delegate observingInputAccessoryViewDidChangeFrame:self];
	}
}

-(void)dealloc
{
	[self.superview removeObserver:self forKeyPath:@"center"];
	
	[[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (CGSize)intrinsicContentSize
{
	return CGSizeMake(self.bounds.size.width, _keyboardState == KeyboardStateWillShow || _keyboardState == KeyboardStateWillHide ? 0 : _height);
}

- (void)setHeight:(CGFloat)height
{
	_height = height;
	
	[self invalidateIntrinsicContentSize];
}

- (void)_keyboardWillShowNotification:(NSNotification*)notification
{
    if (_keyboardState != KeyboardStateShown) {
        _keyboardState = KeyboardStateWillShow;
	
        [self invalidateIntrinsicContentSize];
    
        if([_delegate respondsToSelector:@selector(observingInputAccessoryViewKeyboardWillAppear:keyboardDelta:animationDuration:keyboardFrameEndHeight:)])
        {
            NSDictionary *userInfo = notification.userInfo;
            CGFloat delta = _keyboardHeight - _previousKeyboardHeight;
            NSValue *frameEndValue = userInfo[UIKeyboardFrameEndUserInfoKey];
            CGFloat keyboardFrameEnd = [frameEndValue CGRectValue].size.height;
            NSNumber *animationDurationValue = userInfo[UIKeyboardAnimationDurationUserInfoKey];
            NSTimeInterval animationDuration = [animationDurationValue doubleValue];
            
            [_delegate observingInputAccessoryViewKeyboardWillAppear:self keyboardDelta:delta animationDuration:animationDuration keyboardFrameEndHeight:keyboardFrameEnd];
        }
    }
}

- (void)_keyboardDidShowNotification:(NSNotification*)notification
{
    if (_keyboardState != KeyboardStateShown) {
        _keyboardState = KeyboardStateShown;
	
        [self invalidateIntrinsicContentSize];
    }
}

- (void)_keyboardWillHideNotification:(NSNotification*)notification
{
	_keyboardState = KeyboardStateWillHide;
	
	[self invalidateIntrinsicContentSize];
    
    if([_delegate respondsToSelector:@selector(observingInputAccessoryViewKeyboardWillDisappear:)])
    {
        [_delegate observingInputAccessoryViewKeyboardWillDisappear:self];
    }
}

- (void)_keyboardDidHideNotification:(NSNotification*)notification
{
	_keyboardState = KeyboardStateHidden;
	
	[self invalidateIntrinsicContentSize];
}

- (void)_keyboardWillChangeFrameNotification:(NSNotification*)notification
{
    if(self.window)
    {
        return;
    }
    
    CGRect endFrame = [notification.userInfo[UIKeyboardFrameEndUserInfoKey] CGRectValue];
    _keyboardHeight = [UIScreen mainScreen].bounds.size.height - endFrame.origin.y;
    
    [_delegate observingInputAccessoryViewDidChangeFrame:self];
    
	[self invalidateIntrinsicContentSize];
}

@end
