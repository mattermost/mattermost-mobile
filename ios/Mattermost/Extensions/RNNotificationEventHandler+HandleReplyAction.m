// RNNotificationEventHandler+HandleReplyAction.m
#import "RNNotificationEventHandler+HandleReplyAction.h"
#import <UserNotifications/UserNotifications.h>
#import <UIKit/UIKit.h>
#import <objc/runtime.h>
@import Gekidou;

// ---- Forward declaration of the class method we want to call (no header needed)
@interface RNNotificationEventHandler (OriginalSelectorDecl)
- (void)didReceiveNotificationResponse:(UNNotificationResponse *)response
                    completionHandler:(void (^)(void))completionHandler;
@end

@interface RNNotificationParser : NSObject
+ (NSDictionary *)parseNotificationResponse:(UNNotificationResponse *)response;
@end
// ---------------------------------------------------------------------------

NSString *const ReplyActionID = @"REPLY_ACTION";

// The original method we’re swizzling on RNNotificationEventHandler
typedef void (*DidReceiveIMP)(id, SEL, UNNotificationResponse *, void (^)(void));
static DidReceiveIMP original_didReceive_impl = NULL;

#pragma mark - Helpers

static inline void callCompletionOnMain(void (^completion)(void)) {
  if (!completion) return;
  if (NSThread.isMainThread) { completion(); }
  else { dispatch_async(dispatch_get_main_queue(), completion); }
}

static inline void postLocalFailureNotification(NSString *channelId) {
  UNMutableNotificationContent *content = [UNMutableNotificationContent new];
  content.body = @"Message failed to send.";
  NSMutableDictionary *userInfo = [@{@"local": @YES, @"test": @NO} mutableCopy];
  if (channelId) userInfo[@"channel_id"] = channelId;
  content.userInfo = userInfo;

  UNTimeIntervalNotificationTrigger *trigger =
    [UNTimeIntervalNotificationTrigger triggerWithTimeInterval:0.1 repeats:NO];

  NSString *identifier = [NSString stringWithFormat:@"mm-fail-%f",
                          [NSDate timeIntervalSinceReferenceDate]];
  UNNotificationRequest *req =
    [UNNotificationRequest requestWithIdentifier:identifier content:content trigger:trigger];

  [UNUserNotificationCenter.currentNotificationCenter addNotificationRequest:req withCompletionHandler:nil];
}

static inline void updateBadgeToDeliveredCount(void) {
  [UNUserNotificationCenter.currentNotificationCenter
    getDeliveredNotificationsWithCompletionHandler:^(NSArray<UNNotification *> *notes) {
      dispatch_async(dispatch_get_main_queue(), ^{
        UIApplication.sharedApplication.applicationIconBadgeNumber = (NSInteger)notes.count;
      });
    }];
}

#pragma mark - Core sendReply (no RNNotifications headers)

static void sendReplyUsingMattermost(UNNotificationResponse *response,
                                    void (^completion)(void)) {
  NSDictionary *parsedResponse = nil;

  // Guard with runtime presence of the class
  Class Parser = NSClassFromString(@"RNNotificationParser");
  if (Parser && [Parser respondsToSelector:@selector(parseNotificationResponse:)]) {
    // Compiler knows the signature thanks to the forward declaration above
    parsedResponse = [RNNotificationParser parseNotificationResponse:response];
  }

  NSString *serverUrl = [parsedResponse valueForKeyPath:@"notification.server_url"];
  if (serverUrl.length == 0) {
    // minimal fallback
    serverUrl = response.notification.request.content.userInfo[@"server_url"];
  }
  if (serverUrl.length == 0) {
    postLocalFailureNotification(nil);
    callCompletionOnMain(completion);
    return;
  }

  NSDictionary *credentials = [[Keychain default] getCredentialsObjcFor:serverUrl];
  NSString *sessionToken = credentials[@"token"];
  NSString *preauthSecret = credentials[@"preauthSecret"];
  if (sessionToken.length == 0) {
    postLocalFailureNotification(nil);
    callCompletionOnMain(completion);
    return;
  }

  NSString *completionKey = response.notification.request.identifier;

  NSString *message = [parsedResponse valueForKeyPath:@"action.text"];
  if (message.length == 0 && [response isKindOfClass:UNTextInputNotificationResponse.class]) {
    message = ((UNTextInputNotificationResponse *)response).userText;
  }

  NSString *channelId = [parsedResponse valueForKeyPath:@"notification.channel_id"];
  NSString *rootId = [parsedResponse valueForKeyPath:@"notification.root_id"];
  if (rootId.length == 0) {
    rootId = [parsedResponse valueForKeyPath:@"notification.post_id"];
  }

  NSDictionary *post = @{
    @"message": message ?: @"",
    @"channel_id": channelId ?: @"",
    @"root_id": rootId ?: @""
  };

  NSError *jsonErr = nil;
  NSData *postData = [NSJSONSerialization dataWithJSONObject:post options:0 error:&jsonErr];
  if (!postData) {
    postLocalFailureNotification(channelId);
    callCompletionOnMain(completion);
    return;
  }

  // Strip trailing slash
  NSRegularExpression *re = [NSRegularExpression regularExpressionWithPattern:@"/$" options:0 error:nil];
  NSString *urlString = [re stringByReplacingMatchesInString:serverUrl options:0
                                                       range:NSMakeRange(0, serverUrl.length)
                                                withTemplate:@""];
  NSURL *url = [NSURL URLWithString:[urlString stringByAppendingString:@"/api/v4/posts?set_online=false"]];
  if (!url) {
    postLocalFailureNotification(channelId);
    callCompletionOnMain(completion);
    return;
  }

  NSMutableURLRequest *req = [NSMutableURLRequest requestWithURL:url];
  req.HTTPMethod = @"POST";
  [req setValue:[NSString stringWithFormat:@"Bearer %@", sessionToken] forHTTPHeaderField:@"Authorization"];
  [req setValue:@"application/json; charset=utf-8" forHTTPHeaderField:@"Content-Type"];
  if ([preauthSecret isKindOfClass:NSString.class] && preauthSecret.length > 0) {
    [req setValue:preauthSecret forHTTPHeaderField:@"X-Mattermost-Preauth-Secret"];
  }
  req.HTTPBody = postData;

  NSURLSession *session = [NSURLSession sessionWithConfiguration:NSURLSessionConfiguration.ephemeralSessionConfiguration];
  [[session dataTaskWithRequest:req completionHandler:^(NSData *data, NSURLResponse *resp, NSError *err) {
    NSInteger status = [(NSHTTPURLResponse *)resp statusCode];
    if (!err && status == 201) {
      updateBadgeToDeliveredCount();
      callCompletionOnMain(completion);
    } else {
      postLocalFailureNotification(channelId);
      callCompletionOnMain(completion);
    }
  }] resume];
}

#pragma mark - Swizzle SAME selector as original code

@implementation RNNotificationEventHandler (HandleReplyAction)

+ (void)load {
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    Class cls = self;

    SEL sel = @selector(didReceiveNotificationResponse:completionHandler:);
    Method m = class_getInstanceMethod(cls, sel);
    if (!m) return;

    original_didReceive_impl = (DidReceiveIMP)method_getImplementation(m);

    IMP swizzled = imp_implementationWithBlock(^(
      id _self,
      UNNotificationResponse *response,
      void (^completion)(void)
    ){
      if ([response.actionIdentifier isEqualToString:ReplyActionID]) {
        sendReplyUsingMattermost(response, completion);
      } else if (original_didReceive_impl) {
        original_didReceive_impl(_self, sel, response, completion);
      } else {
        callCompletionOnMain(completion);
      }
    });

    method_setImplementation(m, swizzled);
  });
}

@end
