#import <RNNAppDelegate.h>
#import <UIKit/UIKit.h>
#import "RNNotifications.h"
#import <Expo/Expo.h>
#import "ExpoModulesCore-Swift.h"
#import <mattermost_rnutils-Swift.h>
#import <mattermost_hardware_keyboard-Swift.h>


@interface AppDelegate : EXAppDelegateWrapper<OrientationLockable>

@property (nonatomic) UIInterfaceOrientationMask orientationLock;

@end
