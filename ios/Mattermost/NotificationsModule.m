
#import "Mattermost-Swift.h"
#import "NotificationsModule.h"

@implementation NotificationsModule

RCT_EXPORT_MODULE(Notifications)

RCT_EXPORT_METHOD(getDeliveredNotifications:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  [[NotificationHelper default] getDeliveredNotificationsWithCompletionHandler:^(NSArray<UNNotification *> * _Nonnull notifications) {
    NSMutableArray<NSDictionary *> *formattedNotifications = [NSMutableArray new];
    
    for (UNNotification *notification in notifications) {
        [formattedNotifications addObject:[RCTConvert UNNotificationPayload:notification]];
    }
    resolve(formattedNotifications);
  }];
}

RCT_EXPORT_METHOD(removeChannelNotifications:(NSString *) serverUrl channelId:(NSString*) channelId) {
  [[NotificationHelper default] removeChannelNotificationsWithServerUrl:serverUrl channelId:channelId];
}

RCT_EXPORT_METHOD(removeThreadNotifications:(NSString *) serverUrl threadId:(NSString*) threadId) {
  [[NotificationHelper default] removeThreadNotificationsWithServerUrl:serverUrl threadId:threadId];
}

RCT_EXPORT_METHOD(removeServerNotifications:(NSString *) serverUrl) {
  [[NotificationHelper default] removeServerNotificationsWithServerUrl:serverUrl];
}

@end
