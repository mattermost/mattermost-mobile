//
//  Copyright (c) Microsoft Corporation. All rights reserved.
//

#import "IntuneMAMLogger.h"
#import "IntuneMAMPolicy.h"
#import "IntuneMAMPolicyDelegate.h"
#import <UIKit/UIKit.h>

// Notification name for Intune application policy change notifications.
// Applications can register for notifications using the default NSNotificationCenter.
// The NSNotification passed to the observer will contain the IntuneMAMPolicyManager instance
// as the object.
__attribute__((visibility("default")))
extern NSString*_Nonnull const IntuneMAMPolicyDidChangeNotification;

// UserInfo dictionary constants.
__attribute__((visibility("default")))
extern NSString*_Nonnull const IntuneMAMPolicyDidChangeNotificationAccountId;
__attribute__((visibility("default")))
extern NSString*_Nonnull const IntuneMAMSDKLifecycleEventAccountId;
// Reference to the SDK UI overriding the app
__attribute__((visibility("default")))
extern NSString*_Nonnull const IntuneMAMUIScene;

// Notification posted after the Intune SDK completes wiping the managed account.
__attribute__((visibility("default")))
extern NSString*_Nonnull const IntuneMAMWipeDidCompleteNotification;

// Notification posted after the Intune SDK UI has taken over the application
__attribute__((visibility("default")))
extern NSString*_Nonnull const IntuneMAMSDKDidTakeOverUINotification;

// Notification posted after the Intune SDK UI has released the application
__attribute__((visibility("default")))
extern NSString*_Nonnull const IntuneMAMSDKDidReleaseUINotification;

// MAM policy source
typedef NS_ENUM(NSInteger, IntuneMAMPolicySource)
{
    IntuneMAMPolicySource_MDM = 0,      //  the policy is from the MDM channel
    IntuneMAMPolicySource_MAM = 1,      //  the policy is from the MAM channel
    IntuneMAMPolicySource_Other = 2,
};

// MAM web view policy
typedef NS_ENUM(NSInteger, IntuneMAMWebViewPolicy)
{
    IntuneMAMWebViewPolicyUnset = 0,            // the web view will be treated according to the TreatAllWebviewsAsUnmanaged flag
    IntuneMAMWebViewPolicyUnmanaged = 1,        // the web view will be treated as unmanaged
    IntuneMAMWebViewPolicyCurrentIdentity = 2,  // the web view will be treated as the current ui identity
    IntuneMAMWebViewPolicyCurrentIdentityBlockUpload = 3,  // the web view will be treated as the current ui identity but will block file uploads and paste
};

__attribute__((visibility("default")))
@interface IntuneMAMPolicyManager : NSObject

+ (IntuneMAMPolicyManager*_Nonnull) instance;

// setUIPolicyIdentity attempts to switch the UI thread identity to the specified user.
// If the specified user is managed, the SDK will run the conditional launch checks and
// depending on policy may check device compliance, prompt the user for PIN, prompt the
// user for authentication, etc.
//
// The switch identity call may fail or may be canceled by the user. The application should
// delay the operation that requires the identity switch until the result has been returned
// via the completion handler. The completion handler is called on the main thread.
// The possible result codes are:
//
// IntuneMAMSwitchIdentityResultSuccess - The identity change was successful.
// IntuneMAMSwitchIdentityResultCanceled - The identity change was canceled by the user.
// IntuneMAMSwitchIdentityResultNotAllowed - Switching identities is not currently allowed by the SDK.
//      This will be returned if the identity is different from the enrolled user but is from
//      the same organization. Only a single managed identity is allowed in this release.
//      This will also be returned if a thread identity is set on the main thread that does not
//      match the identity passed into this method. If the thread identity on the main thread
//      is different, it should be cleared before calling this method.
// IntuneMAMSwitchIdentityResultFailed - an Unknown error occurred.
//
// This call will not apply file policy on the main thread. To do this, setCurrentThreadIdentity
// must also be called on the main thread.
//
// The empty string may be passed in as the identity to represent 'no user' or an unknown personal account.
// If nil is passed in, the UI identity will fallback to the process identity.
- (void) setUIPolicyAccountId:(NSString*_Nullable)accountId completionHandler:(void (^_Nullable)(IntuneMAMSwitchIdentityResult))completionHandler;
- (void) setUIPolicyAccountId:(NSString*_Nullable)accountId forWindow:(UIWindow*_Nullable)window completionHandler:(void (^_Nullable)(IntuneMAMSwitchIdentityResult))completionHandler;

// setUIPolicyAccountIds is similar to the setUIPolicyAccountId method except it accepts an array of account ids instead of a single account.
// This API is intended to be called by applications having merged views displaying data from more than one account. The array can include any
// number of managed and unmanaged accounts. If the array contains managed accounts, conditional launch will be run for each of these
// accounts. After the conditional launch is completed for all accounts, the completion handler will be called and UI control will be
// returned to the application. If conditional launch blocks an account or if a user cancels out of the conditional launch flow, the
// blockAccountId:reason:forWindow:completionHandler: delegate will get called to notify the application it should hide an account from its
// UI. If the application doesn't implement the blockAccountId:reason:completionHandler: delegate method, the
// identitySwitchRequiredForAccountId:reason:completionHandler: will be called requesting the application switch to an unmanaged
// account. If either of these delegates call the completion handler with a failure result, an alert will be displayed and the application will
// be forced to exit. This method should only be called by applications supporting multiple managed accounts (MultiManagedIdentities set to YES in
// IntuneMAMSettings). A nil or empty accountIds array will be treated as an array populated with 'no user' or an unknown personal account.
- (void) setUIPolicyAccountIds:(NSArray<NSString*>*_Nullable)accountIds completionHandler:(void (^_Nullable)(IntuneMAMSwitchIdentityResult))completionHandler;
- (void) setUIPolicyAccountIds:(NSArray<NSString*>*_Nullable)accountIds forWindow:(UIWindow*_Nullable)window completionHandler:(void (^_Nullable)(IntuneMAMSwitchIdentityResult))completionHandler;

// Returns the UI Entra object ID (e.g. 3ec2c00f-b125-4519-acf0-302ac3761822) for the current key window.
- (NSString*_Nullable) getUIPolicyAccountId;

// Returns the UI Entra object ID (e.g. 3ec2c00f-b125-4519-acf0-302ac3761822) for the specified window.
// window represents a merged view set with setUIPolicyAccountIds:forWindow:completionHandler:, this
// method will return nil. For those windows, call getUIPolicyAccountIdsForWindow:
- (NSString*_Nullable) getUIPolicyAccountIdForWindow:(UIWindow*_Nullable)window;

// Returns an array of UI AccountIds for the specified window. Can also be called for windows that have
// been set with a single account through setUIPolicyAccountId:forWindow:completionHandler:
- (NSArray<NSString*>*_Nullable) getUIPolicyAccountIdsForWindow:(UIWindow*_Nullable)window;

// Returns an array of blocked accounts (AAD object ids). These accounts should be hidden by the application.
// The blockAccountId:reason:forWindow:completionHandler: will be called for each account id in this array. 
- (NSArray<NSString*>* _Nonnull) blockedAccountIds;

// Returns the reason why the specified account is blocked, or IntuneMAMBlockAccountNotBlocked if the account is not currently blocked.
- (IntuneMAMBlockAccountReason) blockedReasonForAccountId:(NSString*_Nonnull)accountId;

// setCurrentThreadAccountId:forScope: will set the current thread Entra object ID (e.g. 3ec2c00f-b125-4519-acf0-302ac3761822) but only for the scope of the passed block
// It is preferable to use scoped thread identities to ensure that they are only set for a specified scope and will have a guaranteed removal.
- (void) setCurrentThreadAccountId:(NSString*_Nullable)accountId forScope:(void(^_Nullable)(void))scope  NS_SWIFT_UNAVAILABLE("Use the IntuneMAMSwiftContextManager.setAccountId(_ :forScope:) APIs instead.");

// Return current thread Entra object ID (e.g. 3ec2c00f-b125-4519-acf0-302ac3761822).
- (NSString*_Nullable) getCurrentThreadAccountId;

// setProcessIdentity sets the process wide Entra object ID (e.g. 3ec2c00f-b125-4519-acf0-302ac3761822).
- (void) setProcessAccountId:(NSString*_Nullable)accountId;
- (NSString*_Nullable) getProcessAccountId;

// Returns the Entra object ID (e.g. 3ec2c00f-b125-4519-acf0-302ac3761822) of the user which initiated the current activity.
// This method can be called within the openURL handler to retrieve the sender's AccountId.
- (NSString*_Nullable) getAccountIdForCurrentActivity;

// Returns TRUE if Intune management policy is applied or required for the application.
// Returns FALSE if no Intune management policy is applied and policy is not required.
- (BOOL) isManagementEnabled;

// Returns TRUE if the specified Entra object ID (e.g. 3ec2c00f-b125-4519-acf0-302ac3761822) is managed.
- (BOOL) isAccountIdManaged:(NSString*_Nullable)accountId;

// Returns TRUE if the two identities are equal. This method performs a case insensitive compare
// as well as comparing the AAD object ids of the identities (if known) to determine if the identities
// are the same.
- (BOOL) isIdentity:(NSString*_Nullable)identity1 equalTo:(NSString*_Nullable)identity2;

// Returns an object that can be used to retrieve the MAM policy for the current thread identity.
- (_Nullable id  <IntuneMAMPolicy>) policy;

// Returns an object that can be used to retrieve the MAM policy for the specified Entra object ID (e.g. 3ec2c00f-b125-4519-acf0-302ac3761822).
- (_Nullable id<IntuneMAMPolicy>) policyForAccountId:(NSString*_Nullable)accountId;

// Returns an object that can be used to retrieve the MAM policy for the specified list of AccountIds. If multiple accounts are provided and at least one account is managed the returned IntuneMAMPolicy will be a standard lock down policy and will not reflect policies of individual AccountIds.
- (_Nullable id<IntuneMAMPolicy>) policyForAccountIds:(NSArray<NSString*>*_Nullable)accountIds;

// Returns an object that can be used to retrieve the MAM policy for the specified window. If the window has multiple identities and at least one is managed the IntuneMAMPolicy will be a standard lock down policy and will not reflect policies of individual identities.
- (_Nullable id<IntuneMAMPolicy>) policyForWindow:(UIWindow*_Nullable)window;

// Sets an IntuneMAMWebViewPolicyDelegate for the passed in WKWebView or SFSafariViewController.
// This delegate should be set for each WKWebView or SFSafariViewController being used to access
// arbitrary URLs or URLs that might access external data. See IntuneMAMPolicyDelegate.h for more
// information about this delegate and if it needs to be set.
- (void) setWebViewPolicyDelegate:(id<IntuneMAMWebViewPolicyDelegate>_Nullable)delegate forWebViewer:(id _Nonnull)webViewer;

// Sets an IntuneMAMWebViewPolicy value for the passed in UIView or UIViewController. This web
// view policy value will apply to any current or future child WKWebViews of the webViewer. A
// WKWebView can also be passed in directly as the webViewer. The passed in webViewPolicy will
// overwrite the TreatAllWebViewsAsUnmanaged flag for the passed in webViewer and its children.
- (void) setWebViewPolicy:(IntuneMAMWebViewPolicy)webViewPolicy forWebViewer:(id _Nonnull)webViewer;

// Returns the account name of the primary user in Entra object ID format (e.g. 3ec2c00f-b125-4519-acf0-302ac3761822).
// Should be called only by applications which don't support multiple managed accounts.
@property (readonly) NSString* _Nullable primaryAccountId;

// Returns an array of managed accounts in AccountId format (e.g. 3ec2c00f-b125-4519-acf0-302ac3761822).
@property (readonly) NSArray<NSString*>* _Nonnull managedAccountIds;

// The delegate property is used to notify the application of certain policy actions that
// it should perform. See IntuneMAMPolicyDelegate.h for more information.
// This property must be set by the time the application's UIApplicationDelegate
// application:willFinishLaunchingWithOptions method returns.
@property (nonatomic,strong, nullable) id<IntuneMAMPolicyDelegate> delegate;

// Logger used by the Intune MAM SDK.
@property (nonatomic,strong, nullable) id<IntuneMAMLogger> logger;

// Returns the method used to obtain the Intune MAM policy. Use this property for telemetry or logging purposes.
@property (nonatomic,readonly) IntuneMAMPolicySource mamPolicySource;

@end
