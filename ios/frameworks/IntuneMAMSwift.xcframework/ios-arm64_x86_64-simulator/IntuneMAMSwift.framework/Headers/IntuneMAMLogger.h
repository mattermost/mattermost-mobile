//
//  Copyright (c) Microsoft Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>

// Intune MAM logging interface.
__attribute__((visibility("default")))
@protocol IntuneMAMLogger<NSObject>

typedef enum IntuneMAMLogLevel
{
    IntuneMAMLogLevelVerbose,
    IntuneMAMLogLevelInfo,
    IntuneMAMLogLevelWarning,
    IntuneMAMLogLevelError
} IntuneMAMLogLevel;

@required

// Messages with IntuneMAMLogLevelVerbose may contain PII (Personally Identifiable Information) data.
// Messages with IntuneMAMLogLevelInfo/IntuneMAMLogLevelWarning/IntuneMAMLogLevelError will not contain
// PII data if ADAL messages are not logged through the Intune MAM SDK. ADAL logging through the SDK can
// be disabled by setting ADALLogOverrideDisabled to YES under IntuneMAMSettings.
- (void) log:(nonnull NSString*)message level:(IntuneMAMLogLevel)level;

@end
