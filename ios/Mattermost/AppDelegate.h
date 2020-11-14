#import <React/RCTBridgeDelegate.h>
#import <UMCore/UMAppDelegateWrapper.h>
#import "RNNotifications.h"

@interface AppDelegate : UMAppDelegateWrapper <UIApplicationDelegate, RCTBridgeDelegate>

@property (nonatomic, strong) UIWindow *window;

@end
