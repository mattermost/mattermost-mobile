//
//  RNNotificationEventHandler+HandleReplyAction.m
//  Mattermost
//
//  Created by Miguel Alatzar on 1/29/20.
//  Copyright © 2020 Mattermost. All rights reserved.
//

#import "AppDelegate.h"
#import "RNNotificationEventHandler+HandleReplyAction.h"
#import <react-native-notifications/RNNotificationParser.h>
#import <objc/runtime.h>
@import Gekidou;

#define notificationCenterKey @"notificationCenter"

NSString *const ReplyActionID = @"REPLY_ACTION";

typedef void (*SendReplyCompletionHandlerIMP)(id, SEL, UNNotificationResponse *, void (^)(void));
static SendReplyCompletionHandlerIMP originalSendReplyCompletionHandlerImplementation = NULL;


@implementation RNNotificationEventHandler (HandleReplyAction)

- (RNNotificationCenter *)notificationCenter{
  return objc_getAssociatedObject(self, notificationCenterKey);
}

- (void)setNotificationCenter:(RNNotificationCenter *)notificationCenter{
  objc_setAssociatedObject(self, notificationCenterKey, notificationCenter, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
}

+ (void)load {
  static dispatch_once_t once_token;
  dispatch_once(&once_token,  ^{
    Class class = [self class];
  
    SEL originalSelector = @selector(didReceiveNotificationResponse:completionHandler:);
    SEL swizzledSelector = @selector(handleReplyAction_didReceiveNotificationResponse:completionHandler:);

    Method originalMethod = class_getInstanceMethod(class, originalSelector);
    Method swizzledMethod = class_getInstanceMethod(class, swizzledSelector);
    
    // Get the implementation of the swizzled method
    IMP swizzledImplementation = method_getImplementation(swizzledMethod);
    
    // Get the original implementation
    IMP originalImplementation = method_getImplementation(originalMethod);
    
    // Set the original method's implementation to the swizzled method's implementation
    method_setImplementation(originalMethod, swizzledImplementation);
    
    originalSendReplyCompletionHandlerImplementation = (SendReplyCompletionHandlerIMP)originalImplementation;
  });
}

- (void)sendReply:(UNNotificationResponse *)response completionHandler:(void (^)(void))notificationCompletionHandler {
  NSDictionary *parsedResponse = [RNNotificationParser parseNotificationResponse:response];
  NSString *serverUrl = [parsedResponse valueForKeyPath:@"notification.server_url"];
  
  if (serverUrl == nil) {
      [self handleReplyFailure:@"" completionHandler:notificationCompletionHandler];
  }
  
  NSString *sessionToken = [[Keychain default] getTokenObjcFor:serverUrl];
  if (sessionToken == nil) {
    [self handleReplyFailure:@"" completionHandler:notificationCompletionHandler];
    return;
  }

  NSString *completionKey = response.notification.request.identifier;
  NSString *message = [parsedResponse valueForKeyPath:@"action.text"];
  NSString *channelId = [parsedResponse valueForKeyPath:@"notification.channel_id"];
  NSString *rootId = [parsedResponse valueForKeyPath:@"notification.root_id"];
  if (rootId == nil) {
    rootId = [parsedResponse valueForKeyPath:@"notification.post_id"];
  }

  NSDictionary *post = @{
    @"message": message,
    @"channel_id": channelId,
    @"root_id": rootId
  };
  NSError *error;
  NSData *postData = [NSJSONSerialization dataWithJSONObject:post options:0 error:&error];
  if (!postData) {
    [self handleReplyFailure:channelId completionHandler:notificationCompletionHandler];
    return;
  }

  NSString *urlString = [serverUrl stringByReplacingOccurrencesOfString:@"/$" withString:@"" options:NSRegularExpressionSearch range:NSMakeRange(0, [serverUrl length])];
  NSString *postsEndpoint = @"/api/v4/posts?set_online=false";
  NSURL *url = [NSURL URLWithString:[NSString stringWithFormat:@"%@%@", urlString, postsEndpoint]];
  NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url];
  [request setHTTPMethod:@"POST"];
  [request setValue:[NSString stringWithFormat:@"Bearer %@", sessionToken] forHTTPHeaderField:@"Authorization"];
  [request setValue:@"application/json; charset=utf-8" forHTTPHeaderField:@"Content-Type"];
  [request setHTTPBody:postData];

  NSURLSessionConfiguration *configuration = [NSURLSessionConfiguration ephemeralSessionConfiguration];
  NSURLSession *session = [NSURLSession sessionWithConfiguration:configuration];
  NSURLSessionDataTask *task = [session dataTaskWithRequest:request completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
    NSInteger statusCode = [(NSHTTPURLResponse *)response statusCode];
    if (statusCode == 201) {
      [self handleReplySuccess:completionKey completionHandler:notificationCompletionHandler];
    } else {
      [self handleReplyFailure:channelId completionHandler:notificationCompletionHandler];
    }
  }];

  [task resume];
}

- (void) handleReplySuccess:(NSString *)completionKey completionHandler:(void (^)(void))completionHandler {
  [[RNNotificationsStore sharedInstance] completeAction:completionKey];
  UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
  [center getDeliveredNotificationsWithCompletionHandler:^(NSArray<UNNotification *> * _Nonnull notifications) {
    [[UIApplication sharedApplication] setApplicationIconBadgeNumber:[notifications count]];
  }];

  dispatch_async(dispatch_get_main_queue(), ^{
    completionHandler();
  });
}

- (void) handleReplyFailure:(NSString *)channelId completionHandler:(void (^)(void))completionHandler {
  RNNotificationCenter *notificationCenter = [self notificationCenter];
  if (!notificationCenter) {
    notificationCenter = [RNNotificationCenter new];
    [self setNotificationCenter:notificationCenter];
  }

  NSNumber *id = [NSNumber numberWithInteger:[NSDate timeIntervalSinceReferenceDate] * 10000];
  NSDictionary *notification = @{
    @"body": @"Message failed to send.",
    @"alertAction": @"",
    @"userInfo": @{
        @"local": @YES,
        @"test": @NO,
        @"channel_id": channelId
    }
  };
  [notificationCenter postLocalNotification:notification withId:id];

  dispatch_async(dispatch_get_main_queue(), ^{
    completionHandler();
  });
}

#pragma mark - Method Swizzling

- (void)handleReplyAction_didReceiveNotificationResponse:(UNNotificationResponse *)response completionHandler:(void (^)(void))completionHandler {
  if ([response.actionIdentifier isEqualToString:ReplyActionID]) {
    [self sendReply:response completionHandler:completionHandler];
  } else {
    originalSendReplyCompletionHandlerImplementation(self, @selector(sendReply:completionHandler:), response, completionHandler);
  }
}

@end
