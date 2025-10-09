//
//  Copyright (c) Microsoft Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>

__attribute__((visibility("default")))
@interface IntuneMAMUIHelper : NSObject

// Shows an alert displaying an error message to the user, indicated that the requested sharing action
// was blocked. Call this method instead of performing the sharing action when isSaveToAllowedForLocation
// or isOpenFromAllowedForLocation returned false.
+ (void) showSharingBlockedMessage:(void(^_Nullable)(void))completion;

// Returns a localized string value for the policy requires restart message.
+ (NSString*_Nullable) getRestartApplicationMessage;

// Generates an image of the specified window regardless of screen capture block policy.
+ (UIImage*_Nullable) captureImageOfWindow:(UIWindow*_Nonnull)window;

@end
