//
//  Copyright (c) Microsoft Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "IntuneMAMUserStatus.h"

// Notification name for Intune User Status change notifications.
// Applications can register for notifications using the default NSNotificationCenter.
// The NSNotification passed to the observer will contain the IntuneMAMUserStatusManager instance as the object.
__attribute__((visibility("default"))) extern NSString*_Nonnull const IntuneMAMUserStatusDidChangeNotification;

// UserInfo dictionary constants.
__attribute__((visibility("default")))
extern NSString*_Nonnull const IntuneMAMUserStatusDidChangeNotificationAccountId;

__attribute__((visibility("default")))
@interface IntuneMAMUserStatusManager : NSObject

+ (IntuneMAMUserStatusManager*_Nonnull) instance;

// Returns an object that can be used to retrieve the user status for the specified Entra object ID (e.g. 3ec2c00f-b125-4519-acf0-302ac3761822).
- (_Nullable id<IntuneMAMUserStatus>) userStatusForAccountId:(NSString*_Nullable)accountId;

@end
