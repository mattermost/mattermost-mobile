//
//  Copyright (c) Microsoft Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <FileProvider/FileProvider.h>
#import "IntuneMAMFileProtectionInfo.h"


__attribute__((visibility("default")))
@interface IntuneMAMFileProtectionManager : NSObject

+ (IntuneMAMFileProtectionManager*_Nonnull) instance;

// Protects the specified path using the policy associated with the specified Entra object ID (e.g. 3ec2c00f-b125-4519-acf0-302ac3761822).
- (void) protect:(NSString*_Nonnull)path accountId:(NSString*_Nullable)accountId;

// Verifies the path is currently protected with the specified Entra object ID (e.g. 3ec2c00f-b125-4519-acf0-302ac3761822).
// If it is not, protect:identity: is called on the path.
- (void) verifyAndProtect:(NSString*_Nonnull)path accountId:(NSString*_Nullable)accountId;

// Returns the protection information for the specified path. Returns nil if the
// path does not exist or the path is not managed by the Intune MAM SDK.
- (_Nullable id<IntuneMAMFileProtectionInfo>) protectionInfo:(NSString*_Nonnull)path;

// Encrypts and protects the specified file for the provided managed user Entra object ID (e.g. 3ec2c00f-b125-4519-acf0-302ac3761822). This is expected to
// be invoked in file provider extensions if shouldFileProviderEncryptFiles policy is enabled.
- (BOOL) encryptFile:(NSString*_Nonnull)filePath forAccountId:(NSString*_Nonnull)accountId;
- (BOOL) encryptFile:(NSString*_Nonnull)filePath forAccountId:(NSString*_Nonnull)accountId error:(NSError*_Nullable*_Nullable)error;

// Decrypts the specified file. This is expected to be invoked in file provider extensions if
// shouldFileProviderEncryptFiles policy is enabled.
- (BOOL) decryptFile:(NSString*_Nonnull)filePath;
- (BOOL) decryptFile:(NSString*_Nonnull)filePath error:(NSError*_Nullable*_Nullable)error;

// Decrypts the specified file and saves it to the copyPath. This is expected to be invoked in
// file provider extensions if shouldFileProviderEncryptFiles policy is enabled and a copy
// of the decrypted file is needed instead of decrypting the original.
- (BOOL) decryptFile:(NSString*_Nonnull)filePath toCopyPath:(NSString*_Nonnull)copyPath;
- (BOOL) decryptFile:(NSString*_Nonnull)filePath toCopyPath:(NSString*_Nonnull)copyPath error:(NSError*_Nullable*_Nullable)error;

// Determines if the given file is encrypted. This is expected to be invoked in
// file provider extensions if shouldFileProviderEncryptFiles policy is enabled.
- (BOOL) isFileEncrypted:(NSString*_Nonnull)filePath;

// Sets current user Entra object ID (e.g. 3ec2c00f-b125-4519-acf0-302ac3761822) used in the file provider enumerator. This is expected to be
// set in file provider extensions in enumeratorForContainerItemIdentifier:error: method
// in multi-identity apps.
- (void) setAccountId:(NSString*_Nonnull)accountId onFileProviderEnumerator:(id<NSFileProviderEnumerator>_Nonnull)enumerator;

// Marks the item as owned by user accountId (e.g. 3ec2c00f-b125-4519-acf0-302ac3761822).
// This is expected to be set in replicated file provider extensions whenever a new
// NSFileProviderItem is handed to the system in multi-identity apps.
- (void) protectFileProviderItem:(NSFileProviderItem _Nonnull)item forAccountId:(NSString*_Nonnull)accountId;

// Patches the specified sqlite3_vfs structure to support file protection. This method should be called
// only if the application has its own sqlite implementation and does not use the system version.
// The vfs pointer must point to a structure matching the standard sqlite3_vfs exactly.
- (void) protectSqliteVFS:(void* _Nonnull)vfs;
- (void) unprotectSqliteVFS:(void* _Nonnull)vfs;

@end
