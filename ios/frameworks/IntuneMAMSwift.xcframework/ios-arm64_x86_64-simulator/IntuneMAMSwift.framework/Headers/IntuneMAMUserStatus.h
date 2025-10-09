//
//  Copyright (c) Microsoft Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>

// IntuneMAMClockStatusNotConfigured   - User clock status is not configured for this user.
// IntuneMAMClockStatusUnknown         - User clock status is configured for this user, but not status has been determined.
// IntuneMAMClockStatusClockedIn       - The user is currently clocked.
// IntuneMAMClockStatusClockedOut      - The user is currently clocked out.
// IntuneMAMClockStatusClockedInStale  - The last known status for the user was clocked in, but the status could not be updated within the required interval.
// IntuneMAMClockStatusClockedOut      - The last known status for the user was clocked out, but the status could not be updated within the required interval.
typedef NS_ENUM(NSInteger, IntuneMAMClockStatus)
{
    IntuneMAMClockStatusNotConfigured = 0,
    IntuneMAMClockStatusUnknown = 1,
    IntuneMAMClockStatusClockedIn = 2,
    IntuneMAMClockStatusClockedOut = 3,
    IntuneMAMClockStatusClockedInStale = 4,
    IntuneMAMClockStatusClockedOutStale = 5,
};

__attribute__((visibility("default")))
@protocol IntuneMAMUserStatus <NSObject>

@required

// Returns the current clock status.
- (IntuneMAMClockStatus) clockStatus;

@end
