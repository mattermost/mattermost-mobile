//
//  Copyright (c) Microsoft Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "IntuneMAMDefs.h"
#import <UIKit/UIKit.h>

typedef NS_ENUM(NSUInteger, IntuneMAMIdentitySwitchReason)
{
    // An identity switch is required so that a URL can be opened
    IntuneMAMIdentitySwitchOpenURL,
    
    // An identity switch is required because the user has cancelled conditional launch
    IntuneMAMIdentitySwitchCancelConditionalLaunch,
    
    // An identity switch is required so that one or more documents can be imported
    IntuneMAMIdentitySwitchDocumentImport
};

typedef NS_ENUM(NSUInteger, IntuneMAMAddIdentityResult)
{
    IntuneMAMAddIdentityResultSuccess,
    IntuneMAMAddIdentityResultFailed
};

typedef NS_ENUM(NSUInteger, IntuneMAMBlockAccountResult)
{
    // The application successfully hid the account.
    IntuneMAMBlockAccountResultSuccess,

    // The application failed to hide the account.
    IntuneMAMBlockAccountResultFailed
};

typedef NS_ENUM(NSUInteger, IntuneMAMBlockAccountReason)
{
    // The account is not blocked.
    IntuneMAMBlockAccountReasonNotBlocked,

    // The account is blocked due to conditional launch blocking the account
    IntuneMAMBlockAccountReasonConditionalLaunchBlocked,

    // The account is blocked due to the user canceling conditional launch.
    IntuneMAMBlockAccountReasonConditionalLaunchCanceled,

    // The account is blocked due to being clocked out.
    IntuneMAMBlockAccountReasonClockedOut
};

__attribute__((visibility("default")))
@protocol IntuneMAMPolicyDelegate <NSObject>

@optional

// Called by the Intune SDK to inform the application an identity switch is required.
// The application must call the completion handler. IntuneMAMSwitchIdentityResultSuccess should
// be passed to the completion handler if the SDK is allowed to switch to the specified identity,
// otherwise IntuneMAMSwitchIdentityResultFailed should be passed in.
// The SDK will block the operation which required the identity
// switch until the application calls the completion handler. This method may also be
// called in response to a user clicking the 'cancel' button on the PIN or
// Authentication UI after an application resume.
// The completion handler can be called on any thread.
// The application does not have to call setUIPolicyIdentity in response to this call.
- (void) identitySwitchRequiredForAccountId:(NSString*_Nonnull)accountId reason:(IntuneMAMIdentitySwitchReason)reason completionHandler:(void (^_Nonnull)(IntuneMAMSwitchIdentityResult))completionHandler;
- (void) identitySwitchRequiredForAccountId:(NSString*_Nonnull)accountId forWindow:(UIWindow*_Nonnull)window reason:(IntuneMAMIdentitySwitchReason)reason completionHandler:(void (^_Nonnull)(IntuneMAMSwitchIdentityResult))completionHandler;

// Delegate method which is called by the SDK to notify the application it should hide the specified account from its UI.
// The application should call the completion handler with success or failure when it's done handling the request. The SDK
// UI will remain visible with a spinner until the completion handler is called. If the application fails to hide the account
// and calls the completion handler with IntuneMAMBlockAccountResultFailed, an alert will be displayed and the application
// will be forced to exit. This delegate will be called for each window with an account that needs to be hidden.
- (void) blockAccountId:(NSString*_Nonnull)accountId reason:(IntuneMAMBlockAccountReason)reason completionHandler:(void(^_Nonnull)(IntuneMAMBlockAccountResult))completionHandler;
- (void) blockAccountId:(NSString*_Nonnull)accountId reason:(IntuneMAMBlockAccountReason)reason forWindow:(UIWindow*_Nonnull)window completionHandler:(void(^_Nonnull)(IntuneMAMBlockAccountResult))completionHandler;

// Called by the Intune SDK when the application should wipe data for the
// specified account Entra object ID (e.g. 3ec2c00f-b125-4519-acf0-302ac3761822).
// Returns TRUE if successful, FALSE if the account data could not be completely wiped.
- (BOOL) wipeDataForAccountId:(NSString*_Nonnull)accountId;

// Called by the Intune SDK when the application needs to restart
// because policy has been received for the first time, or if we're handling a mam-ca remediation
// and are restarting as a part of a SW because we need to remove an existing user.
// This method is called on a background thread.
// Returns TRUE if the host application will restart on its own.
// Returns FALSE if the host application wants the Intune SDK to handle the restart
- (BOOL) restartApplication;

// Called by the Intune SDK when the application needs to add an user account by Entra object ID (e.g. 3ec2c00f-b125-4519-acf0-302ac3761822) as the app has been
// automatically enrolled by the SDK. The application must call the completion handler passing in
// IntuneMAMAddIdentityResultSuccess if the app is able to add the AccountId or IntuneMAMAddIdentityResultFailed otherwise.
// The completion handler can be called on any thread.
- (void) addAccountId:(NSString*_Nonnull)accountId completionHandler:(void (^_Nonnull)(IntuneMAMAddIdentityResult))completionHandler;

@end

__attribute__((visibility("default")))
@protocol IntuneMAMWebViewPolicyDelegate <NSObject>

@required
/**
 * We will call this method each time we navigate to a new URL under a managed account in the WKWebView or
 * SFSafariViewController this delegate is tied to. It will use the result to decide whether we need to restrict access to it.
 * Returning YES will indicate to the SDK that the site being navigated to is an unmanaged external site and should be
 * opened with proper protections. Returning NO will indicate to the SDK that the site being navigated to is an internal
 * site that the app knows is managed, meaning the SDK does not need to restrict access to it. If this delegate method
 * is not implemented, it will assume all URLs in this web view are managed sites.
 *
 * (Note: This method only needs to be implemented if your app is using WKWebViews or SFSafariViewControllers to
 * display arbitrary URLs. Not implementing it is the same as always returning NO. If all the web views presented within
 * the app are being used for accessing non-corporate data, TreatAllWebViewsAsUnmanaged can be set as YES in the
 * app's Info.plist under IntuneMAMSettings. This setting will ensure that pasteboard content is not leaked through any
 * web views.)
 *
 * @param url - the URL the web view will be navigating to
 * @return a BOOL representing if the URL is an external unmanaged URL.
 */
- (BOOL) isExternalURL:(NSURL* _Nonnull) url;

@end
