//
//  Copyright (c) Microsoft Corporation. All rights reserved.
//

#if TARGET_OS_IPHONE
#import <UIKit/UIKit.h>
#endif
#import <Foundation/Foundation.h>
#import "IntuneMAMEnrollmentDelegate.h"

/**
 *  This is sent when the allowedAccounts array changes
 *  the object sent is the NSArray UPN (or nil)
 *  of the allowed users.
 */
__attribute__((visibility("default")))
extern NSString*_Nonnull const IntuneMAMAllowedAccountsDidChangeNotification;


__attribute__((visibility("default")))
@interface IntuneMAMEnrollmentManager : NSObject

#pragma mark - Public APIs

/**
 *  This property should be to the delegate object created by the application.
 */
@property (nonatomic,weak,nullable) id<IntuneMAMEnrollmentDelegate> delegate;

/**
 *  Returns the instance of the IntuneMAMEnrollmentManager class
 *
 *  @return IntuneMAMEnrollmentManager shared instance
 */
+ (IntuneMAMEnrollmentManager* _Nonnull) instance;

/**
 *  Init is not available, please use instance:
 *
 *  Xcode issues a warning if you try to override the annotation.
 *  Note that we'll return nil if you use this
 *  because you should not use this, you should use instance above.
 *
 *  @return nil
 */
- (id _Nonnull) init __attribute__((unavailable("Must use + (IntuneMAMEnrollmentManager*) instance")));

/**
 *  This method will add the account to the list of registered accounts.
 *  An enrollment request will immediately be started.  If the enrollment
 *  is not successful, the SDK will periodically re-try the enrollment every
 *  24 hours.
 *  If the application has already registered an account using this API, and calls
 *  it again, the SDK will ignore the request and output a warning.
 *  Any SDK API that requires enrollment will not be valid until after
 *  enrollment succeeds, for example AppConfig policy is not delivered until
 *  after an enrollment.  Use the IntuneMAMEnrollmentDelegate to determine
 *  if the SDK has successfully enrolled and received policy.
 *
 *  @note Do not use this in an extension.  If you do so, we will return
 *  IntuneMAMEnrollmentStatusUnsupportedAPI in the IntuneMAMEnrollmentDelegate.
 *
 *  @param accountId The Entra object ID of the account to be registered with the SDK (e.g. 3ec2c00f-b125-4519-acf0-302ac3761822).
 */
- (void)registerAndEnrollAccountId:(NSString *_Nonnull)accountId;

/**
 *  Creates an enrollment request which is started immediately.
 *  The user will be prompted to enter their credentials, 
 *  and we will attempt to enroll the user.
 *  Any SDK API that requires enrollment will not be valid until after
 *  enrollment succeeds, for example AppConfig policy is not delivered until 
 *  after an enrollment.  Use the IntuneMAMEnrollmentDelegate to determine
 *  if the SDK has successfully enrolled and received policy.
 *  Applciations which support UIScenes can call loginAndEnrollAccount:onWindow:
 *  to specify which window the login screen should appear.
 *
 *  @note Do not use this in an extension.  If you do so, we will return
 *  IntuneMAMEnrollmentStatusUnsupportedAPI in the IntuneMAMEnrollmentDelegate.
 *
 *  @param identity The UPN of the account to be logged in and enrolled.
 */
- (void)loginAndEnrollAccount:(NSString *_Nullable)identity;
#if TARGET_OS_IPHONE
- (void)loginAndEnrollAccount:(NSString *_Nullable)identity onWindow:(UIWindow *_Nullable)window;
#endif

/**
 *  This method will remove the provided account from the list of
 *  registered accounts.  Once removed, if the account has enrolled
 *  the application, the account will be un-enrolled.
 *
 *  @note In the case where an un-enroll is initiated, this method will block
 *  until the MAM token is acquired, then return.  This method must be called before
 *  the user is removed from the application (so that required AAD tokens are not purged
 *  before this method is called).
 *
 *  @note Do not use this in an extension.  If you do so, we will return
 *  IntuneMAMEnrollmentStatusUnsupportedAPI in the IntuneMAMEnrollmentDelegate.
 *
 *  @param accountId The Entra object ID of the account to be removed (e.g. 3ec2c00f-b125-4519-acf0-302ac3761822).
 *  @param doWipe   If YES, a selective wipe if the account is un-enrolled
 */
- (void)deRegisterAndUnenrollAccountId:(NSString *_Nonnull)accountId withWipe:(BOOL)doWipe;

/**
 *  Returns a list of UPNs of account currently registered with the SDK.
 *
 *  @return Array containing Entra object IDs of registered accounts
 */
- (NSArray *_Nonnull)registeredAccountIds;

/**
 *  Returns the Entra object ID of the currently enrolled user.  Returns
 *  nil if the application is not currently enrolled.
 *  Should be called only by applications which don't support multiple managed accounts.
 *
 *  @return Entra object ID of the enrolled account (e.g. 3ec2c00f-b125-4519-acf0-302ac3761822).
 */
- (NSString *_Nullable)enrolledAccountId;

/**
 *  Returns an array containing the Entra object ID of all currently enrolled users.
 *
 *  @return Entra object ID of the enrolled account (e.g. 3ec2c00f-b125-4519-acf0-302ac3761822).
 */
- (NSArray<NSString*> *_Nonnull)enrolledAccountIds;

/**
 *  Semi-Private: Please contact the MAM team before using this API
 *  Returns the UPN(s) of the allowed accounts.  Returns
 *  nil if there are no allowed accounts.
 *  If there is an allowed account(s), only these account(s) should be allowed to sign into the app,
 *  and any existing signed in users who are not in allowedAccounts should be signed out.
 *  allowedAccounts returns nil if the administrator has not targeted an allowed account,
 *  in which case the app should do nothing.
 *
 *  @return UPNs of the enrolled account or nil
 */
- (NSArray *_Nullable)allowedAccounts;

/**
 *  Semi-Private: Please contact the MAM team before using this API
 *  Returns the Entra object ID(s) of the allowed accounts.  Returns
 *  nil if there are no allowed accounts.
 *  If there is an allowed account(s), only these account(s) should be allowed to sign into the app,
 *  and any existing signed in users who are not in allowedAccounts should be signed out.
 *  allowedAccounts returns nil if the administrator has not targeted an allowed account,
 *  in which case the app should do nothing.
 *
 *  @return Entra object ID of the enrolled account or nil
 */
- (NSArray *_Nullable)allowedAccountIds;

/**
 *  Asynchronously returns the Entra object ID of the MDM enrolled user. Returns nil if the device is not MDM enrolled.
 *  For 3rd party applications, the application must also be managed and have IntuneMAMOID
 *  set to the MDM enrolled user in managed app config.
 *
 */
- (void) mdmEnrolledAccountIdWithCompletion:(void (^_Nonnull)(NSString*_Nullable))completionHandler;

@end
