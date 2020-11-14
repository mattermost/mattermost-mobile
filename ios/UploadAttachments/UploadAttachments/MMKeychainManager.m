#import <Security/Security.h>
#import "MMKeychainManager.h"

#import <LocalAuthentication/LAContext.h>
#import <UIKit/UIKit.h>

@implementation MMKeychainManager

// Messages from the comments in <Security/SecBase.h>

#pragma mark - Proposed functionality - Helpers

#define kAuthenticationType @"authenticationType"
#define kAuthenticationTypeBiometrics @"AuthenticationWithBiometrics"

#define kAccessControlType @"accessControl"
#define kAccessControlUserPresence @"UserPresence"
#define kAccessControlBiometryAny @"BiometryAny"
#define kAccessControlBiometryCurrentSet @"BiometryCurrentSet"
#define kAccessControlDevicePasscode @"DevicePasscode"
#define kAccessControlApplicationPassword @"ApplicationPassword"
#define kAccessControlBiometryAnyOrDevicePasscode @"BiometryAnyOrDevicePasscode"
#define kAccessControlBiometryCurrentSetOrDevicePasscode @"BiometryCurrentSetOrDevicePasscode"

#define kBiometryTypeTouchID @"TouchID"
#define kBiometryTypeFaceID @"FaceID"

#define kAuthenticationPromptMessage @"authenticationPrompt"

#pragma mark - Native access

-(NSDictionary *)getInternetCredentialsForServer:(NSString *)server withOptions:(NSDictionary *)options
{
    if (server == nil) {
        return nil;
    }

    NSDictionary *query = @{
                            (__bridge NSString *)kSecClass: (__bridge id)(kSecClassInternetPassword),
                            (__bridge NSString *)kSecAttrServer: server,
                            (__bridge NSString *)kSecReturnAttributes: (__bridge id)kCFBooleanTrue,
                            (__bridge NSString *)kSecReturnData: (__bridge id)kCFBooleanTrue,
                            (__bridge NSString *)kSecMatchLimit: (__bridge NSString *)kSecMatchLimitOne
                            };

    // Look up server in the keychain
    NSDictionary *found = nil;
    CFTypeRef foundTypeRef = NULL;
    OSStatus osStatus = SecItemCopyMatching((__bridge CFDictionaryRef) query, (CFTypeRef*)&foundTypeRef);

    if (osStatus != noErr && osStatus != errSecItemNotFound) {
        return nil;
    }

    found = (__bridge NSDictionary*)(foundTypeRef);
    if (!found) {
        return nil;
    }

    // Found
    NSString *username = (NSString *) [found objectForKey:(__bridge id)(kSecAttrAccount)];
    NSString *password = [[NSString alloc] initWithData:[found objectForKey:(__bridge id)(kSecValueData)] encoding:NSUTF8StringEncoding];

    CFRelease(foundTypeRef);
    NSDictionary *result = @{
                             @"server": server,
                             @"username": username,
                             @"password": password
                             };
    return result;
}

@end
