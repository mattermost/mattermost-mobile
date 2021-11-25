#import <React/RCTBridgeDelegate.h>
#import <Expo/Expo.h>
#import "RNNotifications.h"

@interface AppDelegate : EXAppDelegateWrapper <UIApplicationDelegate, RCTBridgeDelegate>

@property (nonatomic, strong) UIWindow *window;

@end
