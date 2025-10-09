//
//  Copyright (c) Microsoft Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>

__attribute__((visibility("default")))
@interface IntuneMAMSettings: NSObject

//Specifies the background color the SDK should use when presenting UI (ex: PIN screen, diagnostics console).
//Accepts a hexadecimal RGB string in the form of #XXXXXX where X can range from 0-9 or A-F. Assigning a string
//which does not conform to this format will result in the assignment being ignored. The default is light grey.
//This property should be set if the application dynamically determines the background color. If the background color
//is static and known at compile-time, applications do not need to set this property and developers should instead
//set the BackgroundColor value under the IntuneMAMSettings dictionary of the app's info.plist. Values assigned
//to this property are persisted across application launches and are cleared only when the application explicitly
//changes the value or when reinstalling the application. To use the default background color, applications
//can either set this property to nil or an empty string.
@property (class,nonatomic,strong,nullable) NSString* backgroundColor;

//Specifies the foreground color the SDK should use when presenting UI (ex: PIN screen, diagnostics console).
//Accepts a hexadecimal RGB string in the form of #XXXXXX where X can range from 0-9 or A-F. The default is black.
//This property should be set if the application dynamically determines the foreground color. Assigning a string
//which does not conform to this format will result in the assignment being ignored. If the foreground color
//is static and known at compile-time, applications do not need to set this property and developers should instead
//set the ForegroundColor value under the IntuneMAMSettings dictionary of the app's info.plist. Values assigned
//to this property are persisted across application launches and are cleared only when the application explicitly
//changes the value or when reinstalling the application. To use the default foreground color, applications
//can either set this property to nil or an empty string.
@property (class,nonatomic,strong,nullable) NSString* foregroundColor;

//Specifies the accent color the SDK should use when presenting UI (ex: PIN screen, diagnostics console).
//Accepts a hexadecimal RGB string in the form of #XXXXXX where X can range from 0-9 or A-F. The default is system blue.
//This property should be set if the application dynamically determines the accent color. Assigning a string
//which does not conform to this format will result in the assignment being ignored. If the accent color
//is static and known at compile-time, applications do not need to set this property and developers should instead
//set the AccentColor value under the IntuneMAMSettings dictionary of the app's info.plist. Values assigned
//to this property are persisted across application launches and are cleared only when the application explicitly
//changes the value or when reinstalling the application. To use the default accent color, applications
//can either set this property to nil or an empty string.
@property (class,nonatomic,strong,nullable) NSString* accentColor;

//Specifies the secondary background color the SDK should use when presenting UI (ex: MTD screen).
//This is used in sections of the UI that don't have primary content, for example, its used in MTD screens on larger displays
//for buffering on the left and right of the main content area. Ensure to set this different from the backgroundColor property.
//Accepts a hexadecimal RGB string in the form of #XXXXXX where X can range from 0-9 or A-F. Assigning a string
//which does not conform to this format will result in the assignment being ignored. The default is white.
//This property should be set if the application dynamically determines the secondary background color. If the secondary
//background color is static and known at compile-time, applications do not need to set this property and developers
//should instead set the SecondaryBackgroundColor value under the IntuneMAMSettings dictionary of the app's info.plist.
//Values assigned to this property are persisted across application launches and are cleared only when the application
//explicitly changes the value or when reinstalling the application. To use the default secondary background color, applications
//can either set this property to nil or an empty string.
@property (class,nonatomic,strong,nullable) NSString* secondaryBackgroundColor;

//Specifies the secondary foreground color the SDK should use when presenting UI (ex: MTD screen).
//This is used for secondary text content, for example, its used in MTD screens to display footnote text. Ensure to set this
//different from the foregroundColor, backgroundColor and secondaryBackgroundColor properties you've set.
//Accepts a hexadecimal RGB string in the form of #XXXXXX where X can range from 0-9 or A-F. The default is gray.
//This property should be set if the application dynamically determines the secondary foreground color. Assigning a string
//which does not conform to this format will result in the assignment being ignored. If the secondary foreground color
//is static and known at compile-time, applications do not need to set this property and developers should instead
//set the SecondaryForegroundColor value under the IntuneMAMSettings dictionary of the app's info.plist. Values assigned
//to this property are persisted across application launches and are cleared only when the application explicitly
//changes the value or when reinstalling the application. To use the default secondary foreground color, applications
//can either set this property to nil or an empty string.
@property (class,nonatomic,strong,nullable) NSString* secondaryForegroundColor;

// Returns a list of AAD Authority URIs, ordered from highest to lowest priority, that the SDK will attempt
// to use when attempting to silently acquire an access token for the given identity. If the SDK is forced
// to prompt the user for credentials, the first URI in the list will be used.
// The ordering of the URIs in the list is always as follows:
//      1.) The value of the aadAuthorityUriOverride property, if set.
//      2.) Any Authority URIs associated with the given identity found in the ADAL cache.
//      3.) The value of the compile-time authority URI, taken from the ADALAuthority entry under IntuneMAMSettings in the app's info.plist, if set.
//          If no such value is defined in the info.plist, the compile-time authority URI will be the SDK's default value.
+ (NSArray*_Nullable) aadAuthorityUrisForIdentity:(NSString*_Nullable)identity;

// Indicate if telemetry is opted-in or not.
@property (class,nonatomic) BOOL telemetryEnabled;

// Specifies a list of keys for their values to be scrubbed from the logs. This property should be set if there are specific
// configuration values in the logs that applications want to be scrubbed in the json response logging and the diagnostic
// logging.
@property (class,nonatomic,strong,nullable) NSArray* valuesToScrubFromLogging;

// Specifies which AAD authority URI the SDK should use. This property should be set if the application
// dynamically determines the AAD authority URI. If the authority URI is static and known at compile-time,
// applications do not need to set this property and developers should instead set the ADALAuthority value
// under the IntuneMAMSettings dictionary of the app's info.plist. Values asigned to this property are persisted
// across application launches and are cleared only when the application explicitly changes the value, the managed
// identity is unenrolled, or when reinstalling the application. To remove the override, applications can either set
// this property to nil or an empty string.
@property (class,nonatomic,strong,nullable) NSString* aadAuthorityUriOverride;

// Specifies the AAD redirect URI the SDK should use. This property should be set if the application dynamically
// determines the AAD redirect URI. If the redirect URI is static and known at compile-time, applications do not
// need to set this property and developers should instead set the ADALRedirectUri value under the IntuneMAMSettings
// dictionary of the app's info.plist. Values assigned to this property are persisted across application launches
// and are cleared only when the application explicitly changes the value, the managed identity is unenrolled, or
// when reinstalling the application. To remove the override, applications can either  set this property to nil or
// an empty string.
@property (class,nonatomic,strong,nullable) NSString* aadRedirectUriOverride;

// Specifies the AAD client ID the SDK should use. This property should be set if the application dynamically
// determines the AAD client ID. If the client ID is static and known at compile-time, developers should instead set
// the ADALClientId value under the IntuneMAMSettings dictionary of the app's info.plist. Values assigned to this
// property are persisted across application launches and are cleared only when the application explicitly changes the
// value, the managed identity is unenrolled, or when reinstalling the application. To remove the override, applications
// can either set this property to nil or an empty string.
@property (class,nonatomic,strong,nullable) NSString* aadClientIdOverride;

@end
