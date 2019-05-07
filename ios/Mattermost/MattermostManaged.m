//
//  MattermostManaged.m
//  Mattermost
//
// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
//

#import "RCTUITextView.h"
#import "MattermostManaged.h"

@implementation MattermostManaged {
  bool hasListeners;
}

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (void)startObserving {
  hasListeners = YES;
}

- (void)stopObserving {
  hasListeners = NO;
}

- (BOOL)hasSafeAreaInsets {
  UIView *rootView = nil;

  UIApplication *sharedApplication = RCTSharedApplication();
  if (sharedApplication) {
    UIWindow *window = RCTSharedApplication().keyWindow;
    if (window) {
      UIViewController *rootViewController = window.rootViewController;
      if (rootViewController) {
        rootView = rootViewController.view;
      }
    }
  }

  UIEdgeInsets safeAreaInsets = [self safeAreaInsetsForView:rootView];
  return safeAreaInsets.bottom > 0;
}

- (UIEdgeInsets)safeAreaInsetsForView:(UIView *)view {
#if __IPHONE_OS_VERSION_MAX_ALLOWED >= 110000
  if (@available(iOS 11.0, *)) {
    if (view) {
      return view.safeAreaInsets;
    }
  }
#endif

  UIEdgeInsets safeAreaInsets = UIEdgeInsetsMake(0, 0, 0, 0);

  if (view) {
    return safeAreaInsets;
  }

  return safeAreaInsets;
}

- (NSDictionary *)constantsToExport {

  return @{
           @"hasSafeAreaInsets": @([self hasSafeAreaInsets]),
           };
}

- (void)dealloc
{
  [[NSNotificationCenter defaultCenter] removeObserver:self];
  [[NSNotificationCenter defaultCenter] removeObserver:NSUserDefaultsDidChangeNotification];
}

- (NSArray<NSString *> *)supportedEvents
{
  return @[@"managedConfigDidChange"];
}

- (instancetype)init {
  self = [super init];
  if (self) {
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(managedConfigDidChange:) name:@"managedConfigDidChange" object:nil];
    [[NSNotificationCenter defaultCenter] addObserverForName:NSUserDefaultsDidChangeNotification
                                                      object:nil
                                                       queue:[NSOperationQueue mainQueue] usingBlock:^(NSNotification *note) {
                                                         [self remoteConfigChanged];
                                                       }];
  }
  return self;
}

+ (void)sendConfigChangedEvent {
  [[NSNotificationCenter defaultCenter] postNotificationName:@"managedConfigDidChange"
                                                      object:self
                                                    userInfo:nil];
}

// The Managed app configuration dictionary pushed down from an MDM server are stored in this key.
static NSString * const configurationKey = @"com.apple.configuration.managed";

// The dictionary that is sent back to the MDM server as feedback must be stored in this key.
static NSString * const feedbackKey = @"com.apple.feedback.managed";


- (void)managedConfigDidChange:(NSNotification *)notification
{
  NSDictionary *response = [[NSUserDefaults standardUserDefaults] dictionaryForKey:configurationKey];
  if (hasListeners) {
    @try {
      [self sendEventWithName:@"managedConfigDidChange" body:response];
    } @catch (NSException *exception) {
      NSLog(@"Error sending event managedConfigDidChange to JS details=%@", exception.reason);
    }
  }
}

- (void) remoteConfigChanged {
  NSDictionary *response = [[NSUserDefaults standardUserDefaults] dictionaryForKey:configurationKey];
  if (hasListeners) {
    @try {
      [self sendEventWithName:@"managedConfigDidChange" body:response];
    } @catch (NSException *exception) {
      NSLog(@"Error sending event managedConfigDidChange to JS details=%@", exception.reason);
    }
  }
}

RCT_EXPORT_METHOD(getConfig:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  NSDictionary *response = [[NSUserDefaults standardUserDefaults] dictionaryForKey:configurationKey];
  if (response) {
    resolve(response);
  }
  else {
    resolve(@{});
  }
}

RCT_EXPORT_METHOD(quitApp)
{
  exit(0);
}

@end

@implementation RCTUITextView (DisableCopyPaste)

- (BOOL)canPerformAction:(SEL)action withSender:(id)sender
{
  NSDictionary *response = [[NSUserDefaults standardUserDefaults] dictionaryForKey:configurationKey];
  if(response) {
    NSString *copyPasteProtection = response[@"copyAndPasteProtection"];
    BOOL prevent = action == @selector(paste:) ||
    action == @selector(copy:) ||
    action == @selector(cut:) ||
    action == @selector(_share:);

    if ([copyPasteProtection isEqual: @"true"] && prevent) {
      return NO;
    }
  }

  return [super canPerformAction:action withSender:sender];
}

@end
