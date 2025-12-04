#import "AppDelegate.h"

#import <AVFoundation/AVFoundation.h>

#import <React/RCTBundleURLProvider.h>
#import <React/RCTLinkingManager.h>
#import <RNKeychain/RNKeychainManager.h>
#import <ReactNativeNavigation/ReactNativeNavigation.h>
#import <UserNotifications/UserNotifications.h>
#import <TurboLogIOSNative/TurboLog.h>

#import "Mattermost-Swift.h"
#import <os/log.h>

@implementation AppDelegate

@synthesize orientationLock;

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
  NSString *appGroupId = [[NSBundle mainBundle] objectForInfoDictionaryKey:@"AppGroupIdentifier"];
  NSURL *containerURL = [[NSFileManager defaultManager] containerURLForSecurityApplicationGroupIdentifier:appGroupId];
  containerURL = [containerURL URLByAppendingPathComponent:@"Logs"];
  NSError *error = nil;
  [TurboLog configureWithDailyRolling:FALSE maximumFileSize:1024*1024 maximumNumberOfFiles:2 logsDirectory:containerURL.path logsFilename:@"MMLogs" error:&error];
  if (error) {
      NSLog(@"Failed to configure TurboLog: %@", error.localizedDescription);
    }
  [TurboLog writeWithLogLevel:TurboLogLevelInfo message:@[@"Configured turbolog"]];

  // Configure Gekidou to use TurboLog via wrapper
  [[GekidouWrapper default] configureTurboLogForGekidou];

  OrientationManager.shared.delegate = self;
  
  // Clear keychain on first run in case of reinstallation
  if (![[NSUserDefaults standardUserDefaults] objectForKey:@"FirstRun"]) {

    RNKeychainManager *keychain = [[RNKeychainManager alloc] init];
    NSArray<NSString*> *servers = [keychain getAllServersForInternetPasswords];
    [TurboLog writeWithLogLevel:TurboLogLevelInfo message:@[@"Servers", servers]];
    for (NSString *server in servers) {
      [keychain deleteCredentialsForServer:server withOptions:nil];
    }

    [[NSUserDefaults standardUserDefaults] setValue:@YES forKey:@"FirstRun"];
    [[NSUserDefaults standardUserDefaults] synchronize];
  }

  [[AVAudioSession sharedInstance] setCategory:AVAudioSessionCategoryPlayback error: nil];
  [[GekidouWrapper default] setPreference:@"true" forKey:@"ApplicationIsRunning"];

  [RNNotifications startMonitorNotifications];

  os_log(OS_LOG_DEFAULT, "Mattermost started!!");
  [ReactNativeNavigation bootstrapWithDelegate:self launchOptions:launchOptions];
  return YES;
}

-(BOOL)bridgelessEnabled {
  return NO;
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
      if (notification == nil) {
        [TurboLog writeWithLogLevel:TurboLogLevelError message:@[@"Mattermost AppDelegate: Failed to copy userInfo dictionary"]];
        completionHandler(UIBackgroundFetchResultFailed);
        return;
      }

      if (data != nil) {
        NSError *jsonError = nil;
        id json = [NSJSONSerialization JSONObjectWithData:data options:NULL error:&jsonError];
        if (jsonError) {
          [TurboLog writeWithLogLevel:TurboLogLevelError message:@[@"Mattermost AppDelegate: JSON serialization error", jsonError.localizedDescription]];
        } else if (json != nil) {
          [notification setObject:json forKey:@"data"];
        } else {
          [TurboLog writeWithLogLevel:TurboLogLevelWarning message:@[@"Mattermost AppDelegate: JSON serialization returned nil without error"]];
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
  return self.orientationLock;
}

- (NSArray<id<RCTBridgeModule>> *)extraModulesForBridge:(RCTBridge *)bridge
{
  NSMutableArray<id<RCTBridgeModule>> *extraModules = [NSMutableArray new];
  [extraModules addObjectsFromArray:[ReactNativeNavigation extraModulesForBridge:bridge]];
  
  // You can inject any extra modules that you would like here, more information at:
  // https://facebook.github.io/react-native/docs/native-modules-ios.html#dependency-injection
  return extraModules;
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

- (NSURL *)bundleURL
{
  #if DEBUG
    return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
  #else
    return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
  #endif
}

- (NSMutableArray<UIKeyCommand *> *)keyCommands {
  return [MattermostHardwareKeyboardWrapper registerKeyCommandsWithEnterPressed:
          @selector(sendEnter:) shiftEnterPressed:@selector(sendShiftEnter:) findChannels:@selector(sendFindChannels:)];
}

- (void)sendEnter:(UIKeyCommand *)sender {
  [MattermostHardwareKeyboardWrapper enterKeyPressed];
}

- (void)sendShiftEnter:(UIKeyCommand *)sender {
  [MattermostHardwareKeyboardWrapper shiftEnterKeyPressed];
}

- (void)sendFindChannels:(UIKeyCommand *)sender {
  [MattermostHardwareKeyboardWrapper findChannels];
}

@end
