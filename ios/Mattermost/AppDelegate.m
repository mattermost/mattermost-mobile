/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#import "AppDelegate.h"
#import <AVFoundation/AVFoundation.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>
#if __has_include(<React/RNSentry.h>)
#import <React/RNSentry.h> // This is used for versions of react >= 0.40
#else
#import "RNSentry.h" // This is used for versions of react < 0.40
#endif
#import "Orientation.h"
#import "RCCManager.h"
#import "RNNotifications.h"

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  NSURL *jsCodeLocation;

  jsCodeLocation = [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index" fallbackResource:nil];

  self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
  self.window.backgroundColor = [UIColor whiteColor];
  [[RCCManager sharedInstance] initBridgeWithBundleURL:jsCodeLocation launchOptions:launchOptions];
  [[AVAudioSession sharedInstance] setCategory:AVAudioSessionCategoryPlayback error: nil];

  return YES;
}

-(void)application:(UIApplication *)application handleEventsForBackgroundURLSession:(nonnull NSString *)identifier completionHandler:(nonnull void (^)(void))completionHandler {

  NSUserDefaults *bucket = [[NSUserDefaults alloc] initWithSuiteName: @"group.com.mattermost"];
  NSString *credentialsString = [bucket objectForKey:@"credentials"];
  NSData *credentialsData = [credentialsString dataUsingEncoding:NSUTF8StringEncoding];
  NSDictionary *credentials = [NSJSONSerialization JSONObjectWithData:credentialsData options:NSJSONReadingMutableContainers error:nil];
  NSString *server = [credentials objectForKey:@"url"];
  NSString *token = [credentials objectForKey:@"token"];
  
  NSDictionary *post = [NSDictionary dictionaryWithObjectsAndKeys:@"user_id", [bucket objectForKey:@"currentUserId"], @"message", @"Shit fuck", @"channel_id", @"zw43c5ttrjyu9dg7jnudwuz6bw"];
  NSData *postData = [NSJSONSerialization dataWithJSONObject:post options:NSJSONWritingPrettyPrinted error:nil];
  NSString* postAsString = [[NSString alloc] initWithData:postData encoding:NSUTF8StringEncoding];
  
  NSURL *createUrl = [NSURL URLWithString:[server stringByAppendingString:@"/api/v4/posts"]];
  NSURLSessionConfiguration* config = [NSURLSessionConfiguration backgroundSessionConfigurationWithIdentifier:@"backgroundSession-post"];
  config.sharedContainerIdentifier = @"group.com.mattermost";
  
  NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:createUrl cachePolicy:NSURLRequestUseProtocolCachePolicy timeoutInterval:5.0];
  [request setHTTPMethod:@"POST"];
  [request setValue:[@"Bearer " stringByAppendingString:token] forHTTPHeaderField:@"Authorization"];
  [request setValue:@"application/json" forHTTPHeaderField:@"Accept"];
  [request setValue:@"application/json; charset=utf-8" forHTTPHeaderField:@"Content-Type"];
  [request setHTTPBody:[postAsString dataUsingEncoding:NSUTF8StringEncoding]];
  NSURLSession *createSession = [NSURLSession sessionWithConfiguration:config];
  NSURLSessionDataTask *createTask = [createSession dataTaskWithRequest:request];
  [createTask resume];
  
  completionHandler();
}

// Required for orientation
- (UIInterfaceOrientationMask)application:(UIApplication *)application supportedInterfaceOrientationsForWindow:(UIWindow *)window {
  return [Orientation getOrientation];
}

// Required to register for notifications
- (void)application:(UIApplication *)application didRegisterUserNotificationSettings:(UIUserNotificationSettings *)notificationSettings
{
  [RNNotifications didRegisterUserNotificationSettings:notificationSettings];
}

- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken
{
  [RNNotifications didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];
}

- (void)application:(UIApplication *)application didFailToRegisterForRemoteNotificationsWithError:(NSError *)error {
  [RNNotifications didFailToRegisterForRemoteNotificationsWithError:error];
}

// Required for the notification event.
- (void)application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)notification {
  [RNNotifications didReceiveRemoteNotification:notification];
}

// Required for the localNotification event.
- (void)application:(UIApplication *)application didReceiveLocalNotification:(UILocalNotification *)notification
{
  [RNNotifications didReceiveLocalNotification:notification];
}

// Required for the notification actions.
- (void)application:(UIApplication *)application handleActionWithIdentifier:(NSString *)identifier forLocalNotification:(UILocalNotification *)notification withResponseInfo:(NSDictionary *)responseInfo completionHandler:(void (^)())completionHandler
{
  [RNNotifications handleActionWithIdentifier:identifier forLocalNotification:notification withResponseInfo:responseInfo completionHandler:completionHandler];
}

- (void)application:(UIApplication *)application handleActionWithIdentifier:(NSString *)identifier forRemoteNotification:(NSDictionary *)userInfo withResponseInfo:(NSDictionary *)responseInfo completionHandler:(void (^)())completionHandler
{
  [RNNotifications handleActionWithIdentifier:identifier forRemoteNotification:userInfo withResponseInfo:responseInfo completionHandler:completionHandler];
}

@end
