//
//  Copyright © Microsoft Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>

typedef NS_ENUM(NSUInteger, IntuneMAMComplianceStatus)
{
    IntuneMAMComplianceCompliant                = 0, // The user is compliant.
    IntuneMAMComplianceNotCompliant             = 1, // The user has been marked as non-compliant; the app should display the supplied localized string.
    IntuneMAMComplianceServiceFailure           = 2, // There was an error retrieving compliance data from the Intune Service; the app should try again later.
    IntuneMAMComplianceNetworkFailure           = 3, // There was an error connecting to the Intune Service; the app should try again when the network health is restored.
    IntuneMAMComplianceInteractionRequired      = 4, // The SDK encountered a scenario that requires user interaction, the app should call again with silent:NO.
    IntuneMAMComplianceUserCancelled            = 5  // The user has canceled the remediation attmempt.
};

/**
 *  This delegate will return compliance information requested by the app
 */
__attribute__((visibility("default")))
@protocol IntuneMAMComplianceDelegate <NSObject>

/**
 * This method is called when the Intune SDK has completed compliance remediation for an identity.
 * If the identity has not been added to the app and is compliant, it should be added at this time.
 * All values of IntuneMAMComplianceStatus will populate the error parameter with a localized error string.
 * This method is guarenteed to be called after application:willFinishLaunchingWithOptions:
 *
 * @warning Delegate methods are not guarenteed to be called on the Main thread.
 *
 * @param accountId The Entra object ID of the identity for which compliance remediation was requested (e.g. 3ec2c00f-b125-4519-acf0-302ac3761822).
 * @param status The compliance status of identity
 * @param errMsg A localized string describing the error encountered if the identity is not compliant.
 * @param errTitle A localized title string for the error encountered if the identity is not compliant.
 */
- (void) accountId:(NSString*_Nonnull) accountId hasComplianceStatus:(IntuneMAMComplianceStatus) status withErrorMessage:(NSString*_Nonnull) errMsg andErrorTitle:(NSString*_Nonnull) errTitle;

@end

__attribute__((visibility("default")))
@interface IntuneMAMComplianceManager : NSObject

/**
 *  This property should be set to the delegate object created by the application.
 */
@property (nonatomic,weak,nullable) id<IntuneMAMComplianceDelegate> delegate;

+ (IntuneMAMComplianceManager*_Nonnull) instance;

/**
 * When an application requests a resource token from AAD, if it receives an error response indicating non-compliance,
 * the app must initiate Intune APP enrollment via remediateComplianceForIdentity:silent:
 *
 * Compliance status is returned via the delegate method identity:hasComplianceStatus:withErrorMessage:andErrorTitle:
 * The app should wait until this delegate method is called to retry the token acquisition
 *
 * If this API is called mutliple times, additional users will be queued then processed after the currently remediating user has
 * finished.  Calling multiple times for the same user before remediation has completed has no effect, the additional calls will be dropped.
 *
 * @warning If the identity given has not already been enrolled into Intune, this method can cause an application restart.
 * In this case, the Intune SDK will take UI control at next application launch and call the delegate method identity:hasComplianceStatus:withErrorString: when finished
 * If the app knows this is a first time login for identity, it's recomended to set silent to NO as this will likely cause a restart
 *
 * @param accountId The The Entra object ID of the identity sending the request (e.g. 3ec2c00f-b125-4519-acf0-302ac3761822).
 * @param silent A bool indicating whether or not the Intune SDK will take UI control for the duration of the this method
 */
- (void) remediateComplianceForAccountId:(NSString*_Nonnull) accountId silent:(BOOL) silent;

// Returns TRUE if a compliance remediation is in progress for the specified user AccountId (e.g. 3ec2c00f-b125-4519-acf0-302ac3761822).
- (BOOL) remediationInProgressForAccountId:(NSString*_Nonnull) accountId;

@end

