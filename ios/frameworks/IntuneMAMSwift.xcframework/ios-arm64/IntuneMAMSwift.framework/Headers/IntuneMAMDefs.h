//
//  Copyright (c) Microsoft Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>

// Result codes for switching identities.
typedef NS_ENUM(NSUInteger, IntuneMAMSwitchIdentityResult)
{
    IntuneMAMSwitchIdentityResultSuccess,
    IntuneMAMSwitchIdentityResultCanceled,
    IntuneMAMSwitchIdentityResultNotAllowed,
    IntuneMAMSwitchIdentityResultFailed
};
