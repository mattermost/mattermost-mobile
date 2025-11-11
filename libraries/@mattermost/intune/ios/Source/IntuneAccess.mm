// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

#import "IntuneAccess.h"
#import <IntuneMAMSwift/IntuneMAM.h>

#if __has_include(<mattermost_intune/mattermost_intune-Swift.h>)
#import <mattermost_intune/mattermost_intune-Swift.h>
#else
#import "mattermost_intune-Swift.h"
#endif

@implementation IntuneAccess

+ (void)initializeIntuneDelegates {
    // Get the shared delegate handler (Swift singleton)
    IntuneDelegateHandler *intuneDelegate = [IntuneDelegateHandler shared];

    // Set it as delegate for both Intune SDK managers
    [[IntuneMAMEnrollmentManager instance] setDelegate:intuneDelegate];
    [[IntuneMAMPolicyManager instance] setDelegate:intuneDelegate];
}

+ (void)checkAndRestoreEnrollmentOnLaunch {
    [[IntuneEnrollmentManager shared] checkAndRestoreEnrollmentOnLaunch];
}

@end
