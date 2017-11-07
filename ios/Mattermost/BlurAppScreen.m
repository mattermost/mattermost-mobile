//
//  BlurAppScreen.m
//  Mattermost
//
// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
//

#import "BlurAppScreen.h"
#import "UIImage+ImageEffects.h"

@implementation BlurAppScreen{
  BOOL enabled;
  UIImageView *obfuscatingView;
}

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (instancetype)init {
  if ((self = [super init])) {
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(handleAppStateResignActive)
                                                 name:UIApplicationWillResignActiveNotification
                                               object:nil];
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(handleAppStateActive)
                                                 name:UIApplicationDidBecomeActiveNotification
                                               object:nil];
  }
  return self;
}

- (void)dealloc
{
  [[NSNotificationCenter defaultCenter] removeObserver:self name:UIApplicationWillResignActiveNotification object:nil];
  [[NSNotificationCenter defaultCenter] removeObserver:self name:UIApplicationDidBecomeActiveNotification object:nil];
}

- (void)handleAppStateResignActive {
  if (self->enabled) {
    UIWindow    *keyWindow = [UIApplication sharedApplication].keyWindow;
    UIImageView *blurredScreenImageView = [[UIImageView alloc] initWithFrame:keyWindow.bounds];
    
    UIGraphicsBeginImageContext(keyWindow.bounds.size);
    [keyWindow drawViewHierarchyInRect:keyWindow.frame afterScreenUpdates:NO];
    UIImage *viewImage = UIGraphicsGetImageFromCurrentImageContext();
    UIGraphicsEndImageContext();
    
    blurredScreenImageView.image = [viewImage applyLightEffect];
    
    self->obfuscatingView = blurredScreenImageView;
    [[UIApplication sharedApplication].keyWindow addSubview:self->obfuscatingView];
    
  }
}

- (void)handleAppStateActive {
  if  (self->obfuscatingView) {
    [UIView animateWithDuration: 0.3
                     animations: ^ {
                       self->obfuscatingView.alpha = 0;
                     }
                     completion: ^(BOOL finished) {
                       [self->obfuscatingView removeFromSuperview];
                       self->obfuscatingView = nil;
                     }
     ];
  }
}

RCT_EXPORT_METHOD(enabled:(BOOL) _enable) {
  self->enabled = _enable;
}

@end
