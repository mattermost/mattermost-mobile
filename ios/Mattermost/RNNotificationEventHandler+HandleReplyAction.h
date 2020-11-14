
//
//  RNNotificationEventHandler+HandleReplyAction.h
//  Mattermost
//
//  Created by Miguel Alatzar on 1/29/20.
//  Copyright © 2020 Mattermost. All rights reserved.
//

#import <react-native-notifications/RNNotificationEventHandler.h>
#import <react-native-notifications/RNNotificationCenter.h>

@interface RNNotificationEventHandler (HandleReplyAction)
@property (nonatomic, strong) RNNotificationCenter *notificationCenter;
@end

extern NSString *const ReplyActionID;
