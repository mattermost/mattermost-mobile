#import "AppDelegate.h"

#import <AVFoundation/AVFoundation.h>

#import <React/RCTBundleURLProvider.h>
#import <React/RCTLinkingManager.h>
#import <RNKeychain/RNKeychainManager.h>
#import <ReactNativeNavigation/ReactNativeNavigation.h>
#import <UserNotifications/UserNotifications.h>
#import <RNHWKeyboardEvent.h>

#import "Mattermost-Swift.h"
#import <os/log.h>

@implementation AppDelegate

NSString* const NOTIFICATION_MESSAGE_ACTION = @"message";
NSString* const NOTIFICATION_CLEAR_ACTION = @"clear";
NSString* const NOTIFICATION_UPDATE_BADGE_ACTION = @"update_badge";
NSString* const NOTIFICATION_TEST_ACTION = @"test";

-(void)application:(UIApplication *)application handleEventsForBackgroundURLSession:(NSString *)identifier completionHandler:(void (^)(void))completionHandler {
  os_log(OS_LOG_DEFAULT, "Mattermost will attach session from handleEventsForBackgroundURLSession!! identifier=%{public}@", identifier);
  [[GekidouWrapper default] attachSession:identifier completionHandler:completionHandler];
  os_log(OS_LOG_DEFAULT, "Mattermost session ATTACHED from handleEventsForBackgroundURLSession!! identifier=%{public}@", identifier);
}

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
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

  [[AVAudioSession sharedInstance] setCategory:AVAudioSessionCategoryPlayback error: nil];
  [[GekidouWrapper default] setPreference:@"true" forKey:@"ApplicationIsRunning"];

  [RNNotifications startMonitorNotifications];

  self.moduleName = @"Mattermost";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};
  [ReactNativeNavigation bootstrapWithDelegate:self launchOptions:launchOptions];

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
  BOOL isClearAction = (action && [action isEqualToString: NOTIFICATION_CLEAR_ACTION]);
  BOOL isTestAction = (action && [action isEqualToString: NOTIFICATION_TEST_ACTION]);
  
  if (isTestAction) {
    completionHandler(UIBackgroundFetchResultNoData);
    return;
  }

  if (![[GekidouWrapper default] verifySignature:userInfo]) {
      NSMutableDictionary *notification = [userInfo mutableCopy];
      [notification setValue:@"false" forKey:@"verified"];
      [RNNotifications didReceiveBackgroundNotification:notification withCompletionHandler:completionHandler];
      return;
  }

  if (isClearAction) {
    // When CRT is OFF:
    // If received a notification that a channel was read, remove all notifications from that channel (only with app in foreground/background)
    // When CRT is ON:
    // When rootId is nil, clear channel's root post notifications or else clear all thread notifications
    [[NotificationHelper default] clearChannelOrThreadNotificationsWithUserInfo:userInfo];
    [[GekidouWrapper default] postNotificationReceipt:userInfo];
    [RNNotifications didReceiveBackgroundNotification:userInfo withCompletionHandler:completionHandler];
    return;
  }
  
  if (state != UIApplicationStateActive) {
    [[GekidouWrapper default] fetchDataForPushNotification:userInfo withContentHandler:^(NSData * _Nullable data) {
      NSMutableDictionary *notification = [userInfo mutableCopy];
      NSError *jsonError;
      if (data != nil) {
        id json = [NSJSONSerialization JSONObjectWithData:data options:NULL error:&jsonError];
        if (!jsonError) {
          [notification setObject:json forKey:@"data"];
        }
      }
      [RNNotifications didReceiveBackgroundNotification:notification withCompletionHandler:completionHandler];
    }];
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
  [[GekidouWrapper default] setPreference:@"true" forKey:@"ApplicationIsForeground"];
}

-(void)applicationWillResignActive:(UIApplication *)application {
  [[GekidouWrapper default] setPreference:@"false" forKey:@"ApplicationIsForeground"];
}

-(void)applicationDidEnterBackground:(UIApplication *)application {
  [[GekidouWrapper default] setPreference:@"false" forKey:@"ApplicationIsForeground"];
}

-(void)applicationWillTerminate:(UIApplication *)application {
  [[GekidouWrapper default] setPreference:@"false" forKey:@"ApplicationIsForeground"];
  [[GekidouWrapper default] setPreference:@"false" forKey:@"ApplicationIsRunning"];
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
    UIKeyCommand *findChannels = [UIKeyCommand keyCommandWithInput:@"k" modifierFlags:UIKeyModifierCommand action:@selector(sendFindChannels:)];
    if (@available(iOS 13.0, *)) {
      [enter setTitle:@"Send message"];
      [enter setDiscoverabilityTitle:@"Send message"];
      [shiftEnter setTitle:@"Add new line"];
      [shiftEnter setDiscoverabilityTitle:@"Add new line"];
      [findChannels setTitle:@"Find channels"];
      [findChannels setDiscoverabilityTitle:@"Find channels"];
    }
    if (@available(iOS 15.0, *)) {
      [enter setWantsPriorityOverSystemBehavior:YES];
      [shiftEnter setWantsPriorityOverSystemBehavior:YES];
      [findChannels setWantsPriorityOverSystemBehavior:YES];
    }
    
    [commands addObject: enter];
    [commands addObject: shiftEnter];
    [commands addObject: findChannels];
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
- (void)sendFindChannels:(UIKeyCommand *)sender {
  NSString *selected = sender.input;
  [hwKeyEvent sendHWKeyEvent:@"find-channels"];
}

- (NSDictionary *)prepareInitialProps
{
  NSMutableDictionary *initProps = [NSMutableDictionary new];
#ifdef RCT_NEW_ARCH_ENABLED
  initProps[kRNConcurrentRoot] = @([self concurrentRootEnabled]);
#endif
  return initProps;
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self getBundleURL];
}

- (NSURL *)getBundleURL
{
  #if DEBUG
    return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
  #else
    return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
  #endif
}

@end
