//
//  Copyright (c) Microsoft Corporation. All rights reserved.
//
//  File API which can be used to read software encrytped and unencrypted files.
//

#import <Foundation/Foundation.h>
#import "IntuneMAMFileProtectionInfo.h"

__attribute__((visibility("default")))
@interface IntuneMAMFile : NSObject

- (instancetype _Nonnull) init __attribute__((unavailable("Must use class methods to create IntuneMAMFile instance.")));

// Opens an existing file. The flags parameter is the same as the flags passed to POSIX open().
// The openFileAtPath methods without flags opens the file in read/write mode.
+ (instancetype _Nullable) openFileAtPath:(NSString* _Nonnull)path error:(NSError* _Nullable* _Nullable)error;
+ (instancetype _Nullable) openFileAtPath:(NSString* _Nonnull)path flags:(int)flags error:(NSError* _Nullable* _Nullable)error;

// Creates a new file or truncates an existing file for the specified owner Entra object ID(e.g. 3ec2c00f-b125-4519-acf0-302ac3761822). If encryption is required by policy,
// the file contents will be software encrypted on disk. The flags/mode parameters are the same as the flags passed to POSIX open().
+ (instancetype _Nullable) createFileAtPath:(NSString* _Nonnull)path forAccountId:(NSString* _Nullable)accountId error:(NSError* _Nullable* _Nullable)error;
+ (instancetype _Nullable) createFileAtPath:(NSString* _Nonnull)path flags:(int)flags mode:(mode_t)mode forAccountId:(NSString* _Nullable)accountId error:(NSError* _Nullable* _Nullable)error;

// Protects the file for the specified identity. The file will be software encrypted if required by policy.
// If called on an encrypted file and the policy or Entra object ID (e.g. 3ec2c00f-b125-4519-acf0-302ac3761822) changes to no longer require software
// encryption, the file will be decrypted.
+ (BOOL) protectFileAtPath:(NSString* _Nonnull)path forAccountId:(NSString* _Nullable)accountId error:(NSError* _Nullable* _Nullable)error;

// Decrypts the specified file even if policy requires it to be software encrypted.
// Calling protectFileAtPath:forIdentity: will re-encrypt the file if required.
+ (BOOL) decryptFileAtPath:(NSString* _Nonnull)path  error:(NSError* _Nullable* _Nullable)error;

// Returns TRUE if the file at the specified path is software encrypted.
+ (BOOL) isFileEncryptedAtPath:(NSString* _Nonnull)path;

// Returns the protection information for the specified file.
+ (_Nullable id<IntuneMAMFileProtectionInfo>) protectionInfoForFileAtPath:(NSString*_Nonnull)path;

// Read / write file. The input/output will be plain text data. The data on disk will be software
// encrypted if required by policy.
- (ssize_t) read:(void* _Nonnull)buf count:(size_t)count error:(NSError* _Nullable* _Nullable)error;
- (ssize_t) write:(const void* _Nonnull)buf count:(size_t)count error:(NSError* _Nullable* _Nullable)error;
- (ssize_t) pread:(void* _Nonnull)buf count:(size_t)count offset:(off_t)offset error:(NSError* _Nullable* _Nullable)error;
- (ssize_t) pwrite:(const void* _Nonnull)buf count:(size_t)count offset:(off_t)offset error:(NSError* _Nullable* _Nullable)error;

// Seeks to the specified plain-text offset.
- (void) seek:(off_t)offset error:(NSError* _Nullable* _Nullable)error;

// Truncate to the specified plain-text length.
- (void) truncate:(off_t)length error:(NSError* _Nullable* _Nullable)error;

// Returns the current plain-text file pointer offset.
- (off_t) tell:(NSError* _Nullable* _Nullable)error;

// Returns the plain-text size of the file.
- (off_t) size:(NSError* _Nullable* _Nullable)error;

// Syncs the file to disk.
- (void) sync:(NSError* _Nullable* _Nullable)error;
- (void) datasync:(NSError* _Nullable* _Nullable)error;

// Returns TRUE if this file is software encrypted.
- (BOOL) isEncrypted;

// Returns the protection information for this file.
- (_Nullable id<IntuneMAMFileProtectionInfo>) protectionInfo;

// Force closes the file. After this is called, this file object will be unusable and
// another will have to be created to access the file again.
// This is automatically called by dealloc.
- (void) close:(NSError* _Nullable* _Nullable)error;

@end
