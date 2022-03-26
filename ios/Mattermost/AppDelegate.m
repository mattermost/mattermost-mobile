#import "AppDelegate.h"
#import <AVFoundation/AVFoundation.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>
#import <React/RCTLinkingManager.h>
#import <RNKeychain/RNKeychainManager.h>

#import <ReactNativeNavigation/ReactNativeNavigation.h>
#import <UploadAttachments/UploadAttachments-Swift.h>
#import <UploadAttachments/MattermostBucket.h>
#import <UserNotifications/UserNotifications.h>
#import <RNHWKeyboardEvent.h>

#import "Mattermost-Swift.h"
#import <os/log.h>

#ifdef FB_SONARKIT_ENABLED
#import <FlipperKit/FlipperClient.h>
#import <FlipperKitLayoutPlugin/FlipperKitLayoutPlugin.h>
#import <FlipperKitUserDefaultsPlugin/FKUserDefaultsPlugin.h>
#import <FlipperKitNetworkPlugin/FlipperKitNetworkPlugin.h>
#import <SKIOSNetworkPlugin/SKIOSNetworkAdapter.h>
#import <FlipperKitReactPlugin/FlipperKitReactPlugin.h>

static void InitializeFlipper(UIApplication *application) {
  FlipperClient *client = [FlipperClient sharedClient];
  SKDescriptorMapper *layoutDescriptorMapper = [[SKDescriptorMapper alloc] initWithDefaults];
  [client addPlugin:[[FlipperKitLayoutPlugin alloc] initWithRootNode:application withDescriptorMapper:layoutDescriptorMapper]];
  [client addPlugin:[[FKUserDefaultsPlugin alloc] initWithSuiteName:nil]];
  [client addPlugin:[FlipperKitReactPlugin new]];
  [client addPlugin:[[FlipperKitNetworkPlugin alloc] initWithNetworkAdapter:[SKIOSNetworkAdapter new]]];
  [client start];
}
#endif

@import Gekidou;

@interface AppDelegate () <RCTBridgeDelegate>
 
@end

@implementation AppDelegate

NSString* const NOTIFICATION_MESSAGE_ACTION = @"message";
NSString* const NOTIFICATION_CLEAR_ACTION = @"clear";
NSString* const NOTIFICATION_UPDATE_BADGE_ACTION = @"update_badge";
NSString* const NOTIFICATION_TEST_ACTION = @"test";
MattermostBucket* bucket = nil;

-(void)application:(UIApplication *)application handleEventsForBackgroundURLSession:(NSString *)identifier completionHandler:(void (^)(void))completionHandler {
  os_log(OS_LOG_DEFAULT, "Mattermost will attach session from handleEventsForBackgroundURLSession!! identifier=%{public}@", identifier);
  [[UploadSession shared] attachSessionWithIdentifier:identifier completionHandler:completionHandler];
  os_log(OS_LOG_DEFAULT, "Mattermost session ATTACHED from handleEventsForBackgroundURLSession!! identifier=%{public}@", identifier);
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  #if DEBUG
    return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index" fallbackResource:nil];
  #else
    return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
  #endif
}

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
#ifdef FB_SONARKIT_ENABLED
  InitializeFlipper(application);
#endif

  if (bucket == nil) {
    bucket = [[MattermostBucket alloc] init];
  }
  
  if ( UI_USER_INTERFACE_IDIOM() == UIUserInterfaceIdiomPad )
  {
    _allowRotation = YES;
  }
  
  // Clear keychain on first run in case of reinstallation
  if (![[NSUserDefaults standardUserDefaults] objectForKey:@"FirstRun"]) {

    RNKeychainManager *keychain = [[RNKeychainManager alloc] init];
    NSArray<NSString*> *servers = [keychain getAllServersForInternetPasswords];
    NSLog(@"Servers %@", servers);
    for (NSString *server in servers) {
      [keychain deleteCredentialsForServer:server];
    }

    [[NSUserDefaults standardUserDefaults] setValue:@YES forKey:@"FirstRun"];
    [[NSUserDefaults standardUserDefaults] synchronize];
  }

  [ReactNativeNavigation bootstrapWithDelegate:self launchOptions:launchOptions];

  [[AVAudioSession sharedInstance] setCategory:AVAudioSessionCategoryPlayback error: nil];

  [RNNotifications startMonitorNotifications];

  os_log(OS_LOG_DEFAULT, "Mattermost started!!");


  return YES;
}

- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken
{
  [RNNotifications didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];
}

- (void)application:(UIApplication *)application didFailToRegisterForRemoteNotificationsWithError:(NSError *)error {
  [RNNotifications didFailToRegisterForRemoteNotificationsWithError:error];
}

// Required for the notification event.

-(void)application:(UIApplication *)application didReceiveRemoteNotification:(nonnull NSDictionary *)userInfo fetchCompletionHandler:(nonnull void (^)(UIBackgroundFetchResult))completionHandler {
  UIApplicationState state = [UIApplication sharedApplication].applicationState;
  NSString* action = [userInfo objectForKey:@"type"];
  NSString* channelId = [userInfo objectForKey:@"channel_id"];
  BOOL isClearAction = (action && [action isEqualToString: NOTIFICATION_CLEAR_ACTION]);
  BOOL isTestAction = (action && [action isEqualToString: NOTIFICATION_TEST_ACTION]);
  
  if (isTestAction) {
    completionHandler(UIBackgroundFetchResultNoData);
    return;
  }

  if (isClearAction) {
    // If received a notification that a channel was read, remove all notifications from that channel (only with app in foreground/background)
    [self cleanNotificationsFromChannel:channelId];
    [[Network default] postNotificationReceipt:userInfo];
  }
  
  if (state != UIApplicationStateActive || isClearAction) {
    [RNNotifications didReceiveBackgroundNotification:userInfo withCompletionHandler:completionHandler];
  } else {
    completionHandler(UIBackgroundFetchResultNewData);
  }
}

// Required for deeplinking
- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options{
  return [RCTLinkingManager application:application openURL:url options:options];
}

- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url sourceApplication:(NSString *)sourceApplication annotation:(id)annotation {
  return [RCTLinkingManager application:application openURL:url sourceApplication:sourceApplication annotation:annotation];
}

// Only if your app is using [Universal Links](https://developer.apple.com/library/prerelease/ios/documentation/General/Conceptual/AppSearch/UniversalLinks.html).
- (BOOL)application:(UIApplication *)application continueUserActivity:(NSUserActivity *)userActivity
 restorationHandler:(void (^)(NSArray<id<UIUserActivityRestoring>> *restorableObjects))restorationHandler
{
  return [RCTLinkingManager application:application continueUserActivity:userActivity restorationHandler:restorationHandler];
}

-(void)applicationDidBecomeActive:(UIApplication *)application {
  [bucket setPreference:@"ApplicationIsForeground" value:@"true"];
}

-(void)applicationWillResignActive:(UIApplication *)application {
  [bucket setPreference:@"ApplicationIsForeground" value:@"false"];
}

-(void)applicationDidEnterBackground:(UIApplication *)application {
  [bucket setPreference:@"ApplicationIsForeground" value:@"false"];
}

-(void)applicationWillTerminate:(UIApplication *)application {
  [bucket setPreference:@"ApplicationIsForeground" value:@"false"];
}

- (UIInterfaceOrientationMask)application:(UIApplication *)application supportedInterfaceOrientationsForWindow:(UIWindow *)window {
  if (_allowRotation == YES) {
        return UIInterfaceOrientationMaskAllButUpsideDown;
    }else{
        return (UIInterfaceOrientationMaskPortrait);
    }
}

- (NSArray<id<RCTBridgeModule>> *)extraModulesForBridge:(RCTBridge *)bridge
{
  NSMutableArray<id<RCTBridgeModule>> *extraModules = [NSMutableArray new];
  [extraModules addObjectsFromArray:[ReactNativeNavigation extraModulesForBridge:bridge]];
  
  // You can inject any extra modules that you would like here, more information at:
  // https://facebook.github.io/react-native/docs/native-modules-ios.html#dependency-injection
  return extraModules;
}

-(void)cleanNotificationsFromChannel:(NSString *)channelId {
  if ([UNUserNotificationCenter class]) {
    UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
    [center getDeliveredNotificationsWithCompletionHandler:^(NSArray<UNNotification *> * _Nonnull notifications) {
      NSMutableArray<NSString *> *notificationIds = [NSMutableArray new];

      for (UNNotification *prevNotification in notifications) {
        UNNotificationRequest *notificationRequest = [prevNotification request];
        UNNotificationContent *notificationContent = [notificationRequest content];
        NSString *identifier = [notificationRequest identifier];
        NSString* cId = [[notificationContent userInfo] objectForKey:@"channel_id"];

        if ([cId isEqualToString: channelId]) {
          [notificationIds addObject:identifier];
        }
      }

      [center removeDeliveredNotificationsWithIdentifiers:notificationIds];
    }];
  }
}

/*
  https://mattermost.atlassian.net/browse/MM-10601
  Required by react-native-hw-keyboard-event
  (https://github.com/emilioicai/react-native-hw-keyboard-event)
*/
RNHWKeyboardEvent *hwKeyEvent = nil;
- (NSMutableArray<UIKeyCommand *> *)keyCommands {
  if (hwKeyEvent == nil) {
    hwKeyEvent = [[RNHWKeyboardEvent alloc] init];
  }
  
  NSMutableArray *commands = [NSMutableArray new];
  
  if ([hwKeyEvent isListening]) {
    UIKeyCommand *enter = [UIKeyCommand keyCommandWithInput:@"\r" modifierFlags:0 action:@selector(sendEnter:)];
    UIKeyCommand *shiftEnter = [UIKeyCommand keyCommandWithInput:@"\r" modifierFlags:UIKeyModifierShift action:@selector(sendShiftEnter:)];
    if (@available(iOS 13.0, *)) {
      [enter setTitle:@"Send message"];
      [shiftEnter setTitle:@"Add new line"];
    }
    if (@available(iOS 15.0, *)) {
      [enter setWantsPriorityOverSystemBehavior:YES];
      [shiftEnter setWantsPriorityOverSystemBehavior:YES];
    }
    
    [commands addObject: enter];
    [commands addObject: shiftEnter];
  }
  
  return commands;
}

- (void)sendEnter:(UIKeyCommand *)sender {
  NSString *selected = sender.input;
  [hwKeyEvent sendHWKeyEvent:@"enter"];
}
- (void)sendShiftEnter:(UIKeyCommand *)sender {
  NSString *selected = sender.input;
  [hwKeyEvent sendHWKeyEvent:@"shift-enter"];
}

@end
