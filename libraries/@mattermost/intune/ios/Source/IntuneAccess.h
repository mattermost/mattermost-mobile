// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/**
 * Provides initialization and access to Intune MAM delegates.
 * Call this from AppDelegate to initialize Intune before React Native.
 */
@interface IntuneAccess : NSObject

/**
 * Initializes Intune MAM SDK delegates.
 * Should be called from application:willFinishLaunchingWithOptions:
 * This sets up the IntuneMAMEnrollmentDelegate and IntuneMAMPolicyDelegate.
 */
+ (void)initializeIntuneDelegates;
+ (void)checkAndRestoreEnrollmentOnLaunch;

@end

NS_ASSUME_NONNULL_END
