//
//  Copyright (c) Microsoft Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>

typedef NS_ENUM(NSUInteger, IntuneMAMCertificatePinningStatusCode)
{
    IntuneMAMCertificatePinningInvalidChallenge = 100,           // The operation failed because the supplied challenge object is either nil or invalid
    IntuneMAMCertificatePinningInvalidCertificateChain = 101,            // The operation failed because the supplied certificate chain is invalid or empty
    IntuneMAMCertificatePinningNilHost = 102,                    // The operation failed because the supplied host is nil or empty
    IntuneMAMCertificatePinningFailedTrustEvaluation = 103,          // The certificates failed to pass trust certificate validation
    IntuneMAMCertificatePinningFailedFormationEvaluation = 104,          // The certificates failed to pass formation validation
    IntuneMAMCertificatePinningErrorAccessingCert = 105,         // Failed to extract one or more certificates from the chain
    IntuneMAMCertificatePinningAlgNotSupported = 106,            // The operation failed because the specified algorithm is not supported or the hashing operation failed
    IntuneMAMCertificatePinningMatchNotFound = 107,            // Failed to find a matching pin within the provided certificate chain with the provided host
};

__attribute__((visibility("default")))
@interface IntuneMAMCertificatePinningManager : NSObject

+(IntuneMAMCertificatePinningManager* _Nonnull) instance;

// Validates the certificate chain for the specified NSURLAuthenticationChallenge. Returns TRUE if the certificate chain matches the
// expected one for the host and Entra object ID (e.g. 3ec2c00f-b125-4519-acf0-302ac3761822) or if no pins are provided for the host or Entra object ID. If FALSE is returned, the
// certificate chain does not match the expected chain and the application should block the request. If nil is passed in for the
// AccountId, the current thread identity is used to perform the certificate pinning validation.
- (BOOL) validateChainWithChallenge:(NSURLAuthenticationChallenge* _Nonnull)challenge andAccountId:(NSString* _Nullable)accountId error:(NSError* _Nullable* _Nullable)error;

// Validates the certificate chain for the specified cert chain and host. Returns TRUE if the certificate chain matches an expected
// one for the host and Entra object ID (e.g. 3ec2c00f-b125-4519-acf0-302ac3761822) or if no pins are provided for the host or Entra object ID. If FALSE is returned, the certificate
// chain does not match the expected chain and the application should block the request. The certificate array should include the server
// certificate (at index 0) followed by intermediate certificates and lastly with the root certificate (at index -1).
// If nil is passed in for the AccountId, the current thread identity is used to perform the certificate pinning validation.
- (BOOL) validateChainWithCertificates:(NSArray<NSData*>* _Nonnull)certificates andHostname:(NSString* _Nonnull)hostname andAccountId:(NSString* _Nullable)accountId error:(NSError* _Nullable* _Nullable)error;

// Shows an alert displaying an error message to the user with Entra object ID (e.g. 3ec2c00f-b125-4519-acf0-302ac3761822) for certificate pinning validation, indicating that the requested endpoint was blocked. If nil is passed in for the AccountId, the current thread identity is used. Call this method instead when the certificate validation APIs return false.
- (void) showErrorMessageForAccountId:(NSString* _Nullable)accountId withDismissHandler:(void(^_Nullable)(void))dismissHandler;

// Checks if the Intune service sent down certificate pins for an Entra object ID. Pinning is enabled if pins are found for the Entra object ID. Managed apps should check connections using evaluateChallenge or evaluateCertificateChain regardless of the status returned by isPinningEnabledForIdentity. If nil is passed in for the accountId, the current thread identity is used to perform the certificate pinning check.
- (BOOL) isPinningEnabledForAccountId:(NSString* _Nullable)accountId;

@end

