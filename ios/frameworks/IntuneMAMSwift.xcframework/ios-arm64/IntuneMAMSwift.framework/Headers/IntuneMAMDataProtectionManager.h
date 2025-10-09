//
//  Copyright (c) Microsoft Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "IntuneMAMDataProtectionInfo.h"

// Data protection/unprotection operation failure codes
typedef NS_ENUM(NSUInteger, IntuneMAMDataProtectionStatusCode)
{
    IntuneMAMDataProtectionStatusApplicationNotManaged = 100,             // Operation failed because the application is not managed
    IntuneMAMDataProtectionStatusInvalidArguments = 101,             // Operation failed because one or more of the arguments were nil
    IntuneMAMDataProtectionStatusFailedToEncryptData = 102,             // Data encryption operation failed
    IntuneMAMDataProtectionStatusFailedToDecryptData = 103,             // Data decryption operation failed
    IntuneMAMDataProtectionStatusDataNotProtected = 104,             // Operation failed because the data was not encrypted or protected
    IntuneMAMDataProtectionStatusEmptyData = 105             // Operation failed because the data was empty
};

// Notification name for Intune data protection level change notifications.
// Applications should re-protect data for the managed user after this
// notification is received.
// The NSNotification passed to the observer will contain the
// IntuneMAMDataProtectionManager instance as the object.
__attribute__((visibility("default")))
extern NSString*_Nonnull const IntuneMAMDataProtectionDidChangeNotification;

// UserInfo dictionary constants.
__attribute__((visibility("default")))
extern NSString*_Nonnull const IntuneMAMDataProtectionDidChangeNotificationAccountId;

// Data protection/unprotection operation error domain used for NSError objects.
__attribute__((visibility("default")))
extern NSString*_Nonnull IntuneMAMDataProtectionErrorDomain;

__attribute__((visibility("default")))
@interface IntuneMAMDataProtectionManager : NSObject

+ (IntuneMAMDataProtectionManager*_Nonnull) instance;

// Protects the buffer using the policy associated with the specified Entra object ID (e.g. 3ec2c00f-b125-4519-acf0-302ac3761822).
// Returns nil if an error occurs.
- (NSData*_Nullable) protect:(NSData*_Nonnull)data accountId:(NSString*_Nonnull)accountId;

// Protects the buffer using the policy associated with the specified Entra object ID (e.g. 3ec2c00f-b125-4519-acf0-302ac3761822).
// Populates an NSError object and returns nil if an error occurs.
- (NSData*_Nullable) protect:(NSData*_Nonnull)data accountId:(NSString*_Nonnull)accountId withError:(NSError * _Nullable * _Nullable)error;

// Protects the string using the policy associated with the specified Entra object ID (e.g. 3ec2c00f-b125-4519-acf0-302ac3761822).
// Returns a base64 encoded encrypted buffer.
// Returns nil if an error occurs.
- (NSString*_Nullable) protectString:(NSString*_Nonnull)string accountId:(NSString*_Nonnull)accountId;

// Protects the string using the policy associated with the specified Entra object ID (e.g. 3ec2c00f-b125-4519-acf0-302ac3761822).
// Returns a base64 encoded encrypted buffer.
// Populates an NSError object and returns nil if an error occurs.
- (NSString*_Nullable) protectString:(NSString*_Nonnull)string accountId:(NSString*_Nonnull)accountId withError:(NSError * _Nullable * _Nullable)error;

// Returns unprotected data.
// If the specified data was not returned by the protect call, it will be returned unchanged.
// Returns nil if an error occurs.
- (NSData*_Nullable) unprotect:(NSData*_Nonnull)data;

// Returns unprotected data.
// If the specified data was not returned by the protect call, it will be returned unchanged.
// Populates an NSError object and returns nil if an error occurs.
- (NSData*_Nullable) unprotect:(NSData*_Nonnull)data withError:(NSError * _Nullable * _Nullable)error;

// Returns unprotected string.
// If the specified string was not returned by the protectString call, it will be returned unchanged.
// Returns nil if an error occurs.
- (NSString*_Nullable) unprotectString:(NSString*_Nonnull)string;

// Returns unprotected string.
// If the specified string was not returned by the protectString call, it will be returned unchanged.
// Populates an NSError object and returns nil if an error occurs.
- (NSString*_Nullable) unprotectString:(NSString*_Nonnull)string withError:(NSError * _Nullable * _Nullable)error;

// Returns the protection information for the specified buffer.
// Returns nil if the data is not protected by the Intune MAM SDK.
- (id<IntuneMAMDataProtectionInfo>_Nullable) protectionInfo:(NSData*_Nonnull)data;

// Returns the protection information for the specified string.
// Returns nil if the data is not protected by the Intune MAM SDK.
- (id<IntuneMAMDataProtectionInfo>_Nullable) protectionInfoForString:(NSString*_Nonnull)string;

#if TARGET_OS_IPHONE
// Returns the protection information for the specified item provider.
// Share extensions can call this method to retreive the item's owner.
// The item must be loaded by calling loadItemForTypeIdentifier prior to calling this method.
// This method can be called from the completion handler passed to the loadItemForTypeIdentifier call.
// Returns nil if the item provider is not protected by the Intune MAM SDK.
- (id<IntuneMAMDataProtectionInfo>_Nullable) protectionInfoForItemProvider:(NSItemProvider*_Nonnull)itemProvider;
#endif

@end
