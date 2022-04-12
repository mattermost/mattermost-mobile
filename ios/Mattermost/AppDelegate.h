#import <React/RCTBridgeDelegate.h>
#import <UIKit/UIKit.h>
#import "RNNotifications.h"

@interface AppDelegate : UIResponder <UIApplicationDelegate, RCTBridgeDelegate>

@property (nonatomic, strong) UIWindow *window;
@property(nonatomic,assign)BOOL allowRotation;

@end
